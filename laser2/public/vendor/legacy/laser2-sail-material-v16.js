(() => {
  "use strict";

  const VERSION = "LASER2_THIN_CLOTH_VINYL_OPTICS_V16_20260715";
  const master = window.LASER2_CREW_RIGGING_MASTER_V2;
  const rigV16 = window.LASER2_RIGGING_V16;
  if (!master?.sails || !master?.scene || !rigV16) {
    console.error(`${VERSION}: V16 rigging runtime or sail exports are missing`);
    return;
  }

  const Vec3 = master.body.pos.constructor;
  const params = {
    enabled: true,
    clothOpacity: 0.92,
    clothDiffuseTransmission: 0.28,
    clothRoughness: 0.68,
    clothSheen: 0.18,
    weaveContrast: 0.055,
    wetDarkening: 0.12,
    wetGloss: 0.22,
    vinylOpacity: 0.56,
    vinylTransmission: 0.86,
    vinylThicknessM: 0.000508,
    vinylIor: 1.52,
    vinylRoughness: 0.13,
    vinylHaze: 0.18,
    vinylScratch: 0.22,
    transmittedRigShadow: 0.54,
    transmittedShadowBlurM: 0.055,
    sunlightScale: 0.82,
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
  };

  const sailEntries = [];
  const shaders = [];
  const vinylMeshes = [];
  const sunDirection = new Vec3(0.45, 0.52, 0.32).normalize();
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

  function windowFunctionGLSL(kind) {
    if (kind === "main") {
      return `
        float y = smoothstep(0.095, 0.116, uv.y) * (1.0 - smoothstep(0.205, 0.228, uv.y));
        float row = clamp((uv.y - 0.10) / 0.12, 0.0, 1.0);
        float lo = mix(0.16, 0.23, row);
        float hi = mix(0.64, 0.58, row);
        float x = smoothstep(lo, lo + 0.025, uv.x) * (1.0 - smoothstep(hi - 0.025, hi, uv.x));
        return x * y;
      `;
    }
    if (kind === "jib") {
      return `
        float y = smoothstep(0.105, 0.130, uv.y) * (1.0 - smoothstep(0.275, 0.302, uv.y));
        float row = clamp((uv.y - 0.11) / 0.18, 0.0, 1.0);
        float lo = mix(0.20, 0.31, row);
        float hi = mix(0.78, 0.64, row);
        float x = smoothstep(lo, lo + 0.03, uv.x) * (1.0 - smoothstep(hi - 0.03, hi, uv.x));
        return x * y;
      `;
    }
    return "return 0.0;";
  }

  function shaderHeader(kind, mastCount, boomCount) {
    return `
      uniform float uRigTime;
      uniform float uRigWetness;
      uniform float uClothOpacity;
      uniform float uClothTransmission;
      uniform float uWeaveContrast;
      uniform float uWetDarkening;
      uniform float uWetGloss;
      uniform float uRigShadowStrength;
      uniform float uRigShadowBlur;
      uniform float uSunlightScale;
      uniform vec3 uRigSunDir;
      uniform vec3 uRigMast[${mastCount}];
      uniform vec3 uRigBoom[${boomCount}];
      varying vec3 vRigWorldPosition;
      varying vec3 vRigWorldNormal;

      float rigWindowMask(vec2 uv) {
        ${windowFunctionGLSL(kind)}
      }

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
        return (1.0 - smoothstep(radius, radius + blur, distanceToRay)) * step(0.004, alongRay);
      }

      float rigThroughShadow(vec3 worldPosition, vec3 toSun) {
        float occlusion = 0.0;
        for (int i = 0; i < ${mastCount - 1}; i++) {
          float f = float(i) / float(${Math.max(1, mastCount - 1)});
          float radius = mix(0.032, 0.022, f);
          occlusion = max(occlusion, rigSegmentShadow(worldPosition, toSun, uRigMast[i], uRigMast[i + 1], radius, uRigShadowBlur));
        }
        for (int i = 0; i < ${boomCount - 1}; i++) {
          occlusion = max(occlusion, rigSegmentShadow(worldPosition, toSun, uRigBoom[i], uRigBoom[i + 1], 0.038, uRigShadowBlur));
        }
        return 1.0 - uRigShadowStrength * occlusion;
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
    material.transparent = true;
    material.opacity = 1;
    material.depthWrite = false;
    material.alphaTest = 0.015;
    material.roughness = params.clothRoughness;
    material.sheen = params.clothSheen;
    material.sheenRoughness = 0.72;
    material.metalness = 0;
    material.transmission = 0;
    material.thickness = 0;
    material.emissiveIntensity = 0;
    material.side = 2;
    material.forceSinglePass = false;
    material.premultipliedAlpha = true;
    material.needsUpdate = true;
    material.customProgramCacheKey = () => `${VERSION}:cloth:${kind}:2`;
    material.onBeforeCompile = (shader) => {
      const uniforms = {
        uRigTime: { value: timeS },
        uRigWetness: { value: 0 },
        uClothOpacity: { value: params.clothOpacity },
        uClothTransmission: { value: params.clothDiffuseTransmission },
        uWeaveContrast: { value: params.weaveContrast },
        uWetDarkening: { value: params.wetDarkening },
        uWetGloss: { value: params.wetGloss },
        uRigShadowStrength: { value: params.transmittedRigShadow },
        uRigShadowBlur: { value: params.transmittedShadowBlurM },
        uSunlightScale: { value: params.sunlightScale },
        uRigSunDir: { value: sunDirection.clone() },
        uRigMast: { value: master.rig.mast.map((p) => p.x.clone()) },
        uRigBoom: { value: master.rig.boom.map((p) => p.x.clone()) },
      };
      Object.assign(shader.uniforms, uniforms);
      patchVertexShader(shader);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           ${shaderHeader(kind, master.rig.mast.length, master.rig.boom.length)}`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
           float rigWindow = rigWindowMask(vMapUv);
           float weaveA = sin(vMapUv.x * 1040.0 + sin(vMapUv.y * 31.0) * 0.7);
           float weaveB = sin(vMapUv.y * 890.0 + sin(vMapUv.x * 27.0) * 0.6);
           float weave = weaveA * weaveB;
           float weaveFilter = clamp(0.7 / max(1.0, fwidth(vMapUv.x) * 1040.0 + fwidth(vMapUv.y) * 890.0), 0.0, 1.0);
           diffuseColor.rgb *= 1.0 + uWeaveContrast * weave * weaveFilter;
           diffuseColor.rgb *= 1.0 - uWetDarkening * uRigWetness;
           diffuseColor.a *= uClothOpacity * (1.0 - smoothstep(0.04, 0.96, rigWindow));`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
           roughnessFactor = mix(roughnessFactor, max(0.26, roughnessFactor - uWetGloss), uRigWetness);`,
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
           vec3 rigFaceNormal = normalize(vRigWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
           vec3 rigToSun = normalize(uRigSunDir);
           float rigBacklit = max(dot(-rigFaceNormal, rigToSun), 0.0);
           vec3 rigToCamera = normalize(cameraPosition - vRigWorldPosition);
           float rigGrazing = pow(1.0 - abs(dot(rigFaceNormal, rigToCamera)), 3.0);
           float rigShadow = rigThroughShadow(vRigWorldPosition, rigToSun);
           float rigTransmit = uClothTransmission * rigBacklit * rigShadow * uSunlightScale;
           totalEmissiveRadiance += diffuseColor.rgb * rigTransmit * (0.82 + 0.18 * rigGrazing);`,
        );
      shaders.push({ kind, type: "cloth", shader, uniforms });
      state.shaderCompiles++;
    };
  }

  function installVinylShader(material, kind) {
    material.transparent = true;
    material.opacity = 1;
    material.depthWrite = false;
    material.alphaTest = 0.01;
    material.roughness = params.vinylRoughness;
    material.metalness = 0;
    material.transmission = params.vinylTransmission;
    material.thickness = params.vinylThicknessM;
    material.ior = params.vinylIor;
    material.clearcoat = 0.32;
    material.clearcoatRoughness = 0.18;
    material.attenuationDistance = 0.35;
    if (material.attenuationColor?.setRGB) material.attenuationColor.setRGB(0.87, 0.95, 0.98);
    if (material.color?.setRGB) material.color.setRGB(0.82, 0.93, 0.97);
    material.side = 2;
    material.forceSinglePass = false;
    material.premultipliedAlpha = true;
    material.needsUpdate = true;
    material.customProgramCacheKey = () => `${VERSION}:vinyl:${kind}:2`;
    material.onBeforeCompile = (shader) => {
      const uniforms = {
        uRigTime: { value: timeS },
        uRigWetness: { value: 0 },
        uVinylOpacity: { value: params.vinylOpacity },
        uVinylHaze: { value: params.vinylHaze },
        uVinylScratch: { value: params.vinylScratch },
      };
      Object.assign(shader.uniforms, uniforms);
      patchVertexShader(shader);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
           uniform float uRigTime;
           uniform float uRigWetness;
           uniform float uVinylOpacity;
           uniform float uVinylHaze;
           uniform float uVinylScratch;
           varying vec3 vRigWorldPosition;
           varying vec3 vRigWorldNormal;
           float rigWindowMask(vec2 uv) { ${windowFunctionGLSL(kind)} }`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
           float rigWindow = rigWindowMask(vMapUv);
           if (rigWindow < 0.015) discard;
           float edgeWidth = 0.08 + 1.8 * fwidth(rigWindow);
           float tapeEdge = smoothstep(0.02, edgeWidth, rigWindow) * (1.0 - smoothstep(0.60, 0.98, rigWindow));
           float crease = pow(abs(sin(vMapUv.x * 37.0 + sin(vMapUv.y * 17.0) * 2.1)), 22.0);
           float scratch = pow(abs(sin(vMapUv.x * 713.0 + vMapUv.y * 193.0)), 34.0);
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.89, 0.78), tapeEdge * 0.34);
           diffuseColor.rgb *= 1.0 - crease * 0.035 - scratch * uVinylScratch * 0.08;
           diffuseColor.a *= rigWindow * uVinylOpacity;`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>
           float rigScratchR = pow(abs(sin(vMapUv.x * 713.0 + vMapUv.y * 193.0)), 28.0);
           float rigCreaseR = pow(abs(sin(vMapUv.x * 37.0 + sin(vMapUv.y * 17.0) * 2.1)), 18.0);
           roughnessFactor = clamp(roughnessFactor + uVinylHaze * 0.18 + rigScratchR * uVinylScratch * 0.48 + rigCreaseR * 0.16, 0.04, 0.58);`,
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
    overlay.name = `laser2-${kind}-vinyl-window-v16`;
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
    mesh.name = `laser2-${kind}-cloth-v16`;
    const originalMaterial = mesh.material;
    const originalVisible = mesh.visible;
    const originalCastShadow = mesh.castShadow;
    const originalReceiveShadow = mesh.receiveShadow;
    const cloth = originalMaterial.clone();
    installClothShader(cloth, kind);
    mesh.material = cloth;
    // Three's stock depth pass cannot see the procedural window/cloth alpha
    // masks installed in onBeforeCompile. Disable the otherwise opaque sail
    // silhouette until an alpha-aware custom depth pass is supplied.
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
      if (u.uClothOpacity) u.uClothOpacity.value = params.clothOpacity;
      if (u.uClothTransmission) u.uClothTransmission.value = params.clothDiffuseTransmission;
      if (u.uWeaveContrast) u.uWeaveContrast.value = params.weaveContrast;
      if (u.uWetDarkening) u.uWetDarkening.value = params.wetDarkening;
      if (u.uWetGloss) u.uWetGloss.value = params.wetGloss;
      if (u.uRigShadowStrength) u.uRigShadowStrength.value = params.transmittedRigShadow;
      if (u.uRigShadowBlur) u.uRigShadowBlur.value = params.transmittedShadowBlurM;
      if (u.uSunlightScale) u.uSunlightScale.value = params.sunlightScale;
      if (u.uRigSunDir) u.uRigSunDir.value.copy(sunDirection);
      if (u.uVinylOpacity) u.uVinylOpacity.value = params.vinylOpacity;
      if (u.uVinylHaze) u.uVinylHaze.value = params.vinylHaze;
      if (u.uVinylScratch) u.uVinylScratch.value = params.vinylScratch;
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
      if (entry.vinyl) {
        entry.vinyl.material.roughness = params.vinylRoughness;
        entry.vinyl.material.transmission = params.vinylTransmission;
        entry.vinyl.material.thickness = params.vinylThicknessM;
        entry.vinyl.material.ior = params.vinylIor;
      }
      // Main and jib are always-set sails; their visibility follows the optics
      // master switch. The V16 core explicitly distinguishes a real douse
      // transition from the legacy startup timer, which otherwise showed a
      // phantom stowed spinnaker for the first 2.5 seconds after each reset.
      if (entry.kind === "spin") {
        entry.mesh.visible =
          params.enabled && !!rigV16.helpers?.isSpinnakerPhysical?.();
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
          model: "two-sided PBR reflection plus sunlight-driven diffuse transmission",
          opacity: params.clothOpacity,
          diffuseTransmission: params.clothDiffuseTransmission,
          roughness: params.clothRoughness,
          sheen: params.clothSheen,
          analyticRigShadow: true,
          castShadowModel: "disabled: stock depth pass cannot honor procedural cloth/window alpha",
        },
        vinyl: {
          model: "separate co-moving MeshPhysicalMaterial pass with continuous UV mask",
          windows: ["main", "jib"],
          thicknessM: params.vinylThicknessM,
          ior: params.vinylIor,
          transmission: params.vinylTransmission,
          opacity: params.vinylOpacity,
          haze: params.vinylHaze,
        },
      },
      wetness01: rigV16.state.wetness01 || 0,
      truthBoundary: {
        verified: "main and jib both receive distinct clear-window regions; cloth backlight follows the scene sun and deformed rig",
        inferred: "spectral cloth/vinyl transport, weave scale, scratch density and window polygons require target-sail HDR/photo calibration",
        reduced: "vinyl uses screen-space transmission without resolved 0.508 mm shell refraction or multiple-scattering Monte Carlo transport",
      },
      sourceModified: true,
    };
  }

  function addUI() {
    const panel = document.querySelector(".laser2-lab");
    if (!panel || document.getElementById("laser2-v16-optics-panel")) return;
    const section = document.createElement("section");
    section.id = "laser2-v16-optics-panel";
    section.innerHTML = `
      <h3>V16 · THIN CLOTH / CLEAR VINYL</h3>
      <table><tbody>
        <tr><td>cloth transport</td><td id="v16-cloth-state">—</td></tr>
        <tr><td>vinyl windows</td><td id="v16-vinyl-state">—</td></tr>
        <tr><td>rig shadow</td><td>sun ray → mast/boom capsules</td></tr>
      </tbody></table>
      <label>cloth transmission <input id="v16-cloth-trans" type="range" min="0" max="0.55" step="0.01" value="${params.clothDiffuseTransmission}"> <span id="v16-cloth-trans-v">${Math.round(params.clothDiffuseTransmission * 100)}%</span></label>
      <label>vinyl clarity <input id="v16-vinyl-clear" type="range" min="0.25" max="0.95" step="0.01" value="${params.vinylTransmission}"> <span id="v16-vinyl-clear-v">${Math.round(params.vinylTransmission * 100)}%</span></label>
      <label>vinyl haze <input id="v16-vinyl-haze" type="range" min="0" max="0.5" step="0.01" value="${params.vinylHaze}"> <span id="v16-vinyl-haze-v">${Math.round(params.vinylHaze * 100)}%</span></label>
      <div class="truth">THE WHITE CLOTH IS A SCATTERING SHEET, NOT CONSTANT EMISSIVE PAINT. BACKLIGHT FOLLOWS THE SUN AND IS SOFTLY OCCLUDED BY THE DEFORMED MAST/BOOM. MAIN AND JIB WINDOWS ARE SEPARATE 0.508 MM VINYL PASSES WITH FRESNEL/TRANSMISSION, HAZE, CREASE AND SCRATCH RESPONSE.</div>`;
    panel.appendChild(section);
    const bind = (inputId, valueId, key) => {
      const input = section.querySelector(`#${inputId}`);
      const value = section.querySelector(`#${valueId}`);
      input.oninput = () => {
        params[key] = +input.value;
        value.textContent = `${Math.round(params[key] * 100)}%`;
        if (key === "vinylTransmission") {
          for (const mesh of vinylMeshes) mesh.material.transmission = params.vinylTransmission;
        }
      };
    };
    bind("v16-cloth-trans", "v16-cloth-trans-v", "clothDiffuseTransmission");
    bind("v16-vinyl-clear", "v16-vinyl-clear-v", "vinylTransmission");
    bind("v16-vinyl-haze", "v16-vinyl-haze-v", "vinylHaze");
  }

  function refreshUI() {
    addUI();
    const m = metrics();
    const cloth = document.getElementById("v16-cloth-state");
    const vinyl = document.getElementById("v16-vinyl-state");
    if (cloth) cloth.textContent = `${Math.round(m.materials.cloth.diffuseTransmission * 100)}% · ${m.shaderCompiles} programs`;
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
    if (window.__labMetrics === opticsLabMetricsWrapper) {
      window.__labMetrics = previousMetrics;
    }
    state.initialized = false;
    params.enabled = false;
  }

  const previousMetrics = window.__labMetrics;
  function opticsLabMetricsWrapper() {
    const base = typeof previousMetrics === "function" ? previousMetrics() : {};
    return { ...base, sailOpticsV16: metrics() };
  }
  window.__labMetrics = opticsLabMetricsWrapper;

  const receipt = Object.freeze({
    cloth: "original constant emissive opaque sail material replaced by dynamic two-sided sun-driven diffuse transmission",
    shadows: "deformed mast and boom segments analytically soften transmitted back-side light",
    windows: "main and jib clear regions rendered as independent co-moving physical vinyl passes",
    vinylSeed: "0.508 mm industry sail-window recommendation; not a Laser II class-specified thickness",
    calibration: "optical constants remain proposed until measured from the target sails",
  });

  window.LASER2_SAIL_OPTICS_V16 = {
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

  document.head.appendChild(
    Object.assign(document.createElement("style"), {
      textContent: "#laser2-v16-optics-panel{border-top:1px solid rgba(138,202,255,.62)}",
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
