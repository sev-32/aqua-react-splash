(function () {
  "use strict";

  const VERSION = "16.0.0";
  const MODULE_ID = "LASER2_ROPE_HARDWARE_V16";
  const core = window.LASER2_RIGGING_V16;
  const master = window.LASER2_CREW_RIGGING_MASTER_V2;

  if (!core || !master) {
    console.warn(`${MODULE_ID}: V16 rigging core/master exports are required.`);
    return;
  }

  if (window[MODULE_ID] && typeof window[MODULE_ID].destroy === "function") {
    window[MODULE_ID].destroy();
  }

  const world = master.physics;
  const body = master.body;
  const rig = master.rig;
  const sails = master.sails;
  const cfg = master.config;
  const scene = master.scene;
  const ropeSystemExport = master.ropeSystem || master.ropes;
  const ropeExport = master.rope || master.ropes;
  const sourceRopes =
    (ropeSystemExport && ropeSystemExport.ropes) ||
    (ropeExport && ropeExport.ropes) ||
    master.ropes ||
    ropeExport ||
    {};
  const sourceSample = Object.values(sourceRopes).find(
    (rope) => rope && rope.mesh && rope.mesh.geometry,
  );

  if (!sourceSample || !rig || !sails || !scene) {
    console.warn(`${MODULE_ID}: exported rope meshes/rig/sails are unavailable.`);
    return;
  }

  const Vec3 = body.pos.constructor;
  const GroupCtor = master.boat.constructor;
  const MeshCtor = sourceSample.mesh.constructor;
  const GeometryCtor = sourceSample.mesh.geometry.constructor;
  const AttributeCtor =
    sourceSample.mesh.geometry.attributes.position.constructor;

  const params = {
    gravityMps2: 9.81,
    dryGravityScale: 1.0,
    wetWeightGain: 0.48,
    wetPickupRate: 5.0,
    wetDrainRate: 0.16,
    velocityDampingPerSecond: 4.8,
    wetDampingPerSecond: 2.7,
    windDragGain: 0.055,
    goalFollowPerSecond: 2.2,
    xpbdIterations: 7,
    pinnedSpanStrainPasses: 7,
    postCollisionClosureCycles: 2,
    segmentComplianceMPerN: 1.2e-7,
    collisionMarginM: 0.0015,
    deckFriction: 0.18,
    maximumStepSeconds: 1 / 30,
    maximumAnchorJumpM: 0.25,
    maximumResidualBeforeReset01: 0.05,
    maximumContactDetourAllowanceM: 0.18,
    ratchetFrictionCoefficient: 0.28,
    ratchetWrapAngleRad: Math.PI * 0.78,
    maxDiagnosticCapstanRatio: 6.0,
  };

  /*
   * Longitudinal zones are verified class-rule/measurement-diagram ranges.
   * Each exact point below is deliberately marked PROPOSED: it is the zone
   * midpoint used until a survey of the particular hull supplies a measured
   * fitting centre. x is transverse; forwardM is measured from the transom.
   */
  const anchorEvidence = {
    centreMainsheet: {
      zoneM: [0.7, 1.0],
      exact: { xM: 0, forwardM: 0.85 },
      status: "verified zone / PROPOSED midpoint",
    },
    deckControlCleats: {
      zoneM: [1.175, 1.655],
      exact: { xM: 0.28, forwardM: 1.415 },
      status: "verified zone / PROPOSED symmetric midpoint",
    },
    spinnakerFairleads: {
      zoneM: [1.68, 1.85],
      exact: { xM: 0.58, forwardM: 1.765 },
      status: "verified zone / PROPOSED symmetric midpoint",
    },
    trapezeShockcordFairleads: {
      zoneM: [2.39, 2.5],
      exact: { xM: 0.58, forwardM: 2.445 },
      status: "verified zone / PROPOSED symmetric midpoint",
    },
    jibTracksAndCleats: {
      zoneM: [2.5, 2.8],
      minimumInboardOffsetM: 0.2,
      exact: { xM: 0.42, forwardM: 2.65 },
      status: "verified zone / PROPOSED symmetric midpoint",
    },
    mastHeights: {
      gooseneckM: 0.6,
      spreaderM: 2.25,
      shroudAndJibSheaveM: 3.75,
      spinnakerSheaveM: 4.12,
      trapezeM: 4.21,
      headM: 5.82,
      status: "verified/reference nominal heights",
    },
    spinnakerPoleRing: {
      exactM: cfg.spin.poleRingH,
      status: "verified builder/config dimension",
    },
    mainHalyardSheave: {
      exactM: 5.72,
      status: "PROPOSED running height below the verified/reference mast head",
    },
    boomAndMainsheet: {
      physicalBoomEndpointM: cfg.boom.sheetZ,
      aftMainsheetStationM: 2.7,
      status: "PROPOSED physical endpoint and distinct aft-sheet station",
    },
  };

  const metrics = {
    activeRopes: 0,
    sourceRoutesBound: 0,
    customRoutes: 0,
    collisionCount: 0,
    mastCollisionCount: 0,
    boomCollisionCount: 0,
    deckCollisionCount: 0,
    maxStretch01: 0,
    maxProjectionResidual01: 0,
    maxLineSpeedMps: 0,
    residualResetCount: 0,
    maxContactRestAdjustmentM: 0,
    wetNodeFraction: 0,
    sheaveRotationRad: 0,
    forceHooksWritten: 0,
    authoritativeForceHookReplaced: false,
    updateMs: 0,
    routeTelemetry: {},
    cleatTelemetry: {},
    pulleyTelemetry: {},
  };

  const state = {
    initialized: false,
    finite: true,
    lastError: null,
    frame: 0,
  };

  const receipt = {
    id: MODULE_ID,
    version: VERSION,
    role: "post-core rope display dynamics, hardware, and diagnostic telemetry",
    forceAuthority: false,
    forceModelStatement:
      "This module does not write a physics force hook. It is a collision-aware visual XPBD line model plus lumped directional cleat/capstan diagnostics; it is not cable FEA.",
    sourceBinding:
      "Exported ropeSystem/rope meshes remain the route/display integration surface. Their core goals and force constraints remain authoritative; this module rewrites tube vertices only from a post-core frame hook.",
    topology: {
      mainsheet:
        "boom becket -> traveller block -> aft boom sheave -> underside boom lead -> forward boom block -> centre swivel ratchet -> free tail",
      traveller:
        "port aft eye -> centre traveller block -> starboard aft eye; separate adjustment tail to aft cleat",
      vang:
        "mast-foot double/jammer -> boom double -> mast double -> boom double -> mast jammer (four-part purchase)",
      jibSheets:
        "jib clew -> port/starboard track fairlead -> port/starboard cam/C-cleat -> free tail",
      outhaul:
        "boom-end dead-end -> main clew -> forward boom clam/V-cleat -> tail",
      cunningham:
        "tack -> cunningham eye -> mast clam/V-cleat -> tail",
      halyards:
        "sail head -> appropriate mast sheave -> mast-base halyard rack",
    },
    anchorEvidence,
    limitations: [
      "Exact fitting centres marked PROPOSED must be replaced by measurements from the intended boat.",
      "Cleat holding limits and friction coefficients are explicit tunable estimates, not manufacturer test curves.",
      "Rope contact resolves against mast, boom, and analytic deck; detailed tooth/sheave contact is represented by pinned fairlead/tangent guides.",
      "Contact is node-based (not segment CCD) and does not resolve rope-sail, rope-wire, rope-rope, or detailed hardware-surface collisions.",
      "Cleat/capstan states are directional diagnostics only; they do not seize or release the force-authoritative core constraints.",
      "No change is made to V16's authoritative mast/sail force hook or core XPBD constraints.",
    ],
    metricsLifecycle:
      "The additive __labMetrics wrapper restores its predecessor on destroy only while it remains the current wrapper; a later wrapper may retain this snapshot in its closure for that later wrapper's lifetime.",
  };

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const finite = (value, fallback = 0) =>
    Number.isFinite(value) ? value : fallback;
  const smoothstep = (value) => {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  };

  // Matches the exported hull's analytic deck, including cockpit/sole height.
  function hullHalfWidth(u) {
    let value;
    if (u < 0.45) {
      value = 0.775 + (1 - 0.775) * Math.pow(smoothstep(u / 0.45), 0.9);
    } else {
      value = Math.pow(
        Math.cos(((u - 0.45) / 0.55) * (Math.PI / 2)),
        1.18,
      );
    }
    return Math.max(0.016, 0.71 * value);
  }

  function hullSheerY(u) {
    return 0.365 + 0.045 * u + 0.14 * u * u * u;
  }

  function cockpitMask(x, z) {
    const half = hullHalfWidth((z + 2.2) / 4.4) - 0.175;
    const lateral = 1 - smoothstep((Math.abs(x) - (half - 0.07)) / 0.09);
    const aft = smoothstep((z + 1.78) / 0.1);
    const forward = 1 - smoothstep((z - 0.3) / 0.1);
    return lateral * aft * forward;
  }

  function deckY(x, z) {
    const u = clamp((z + 2.2) / 4.4, 0, 1);
    const half = hullHalfWidth(u);
    const crown =
      0.045 * (1 - Math.pow(Math.min(Math.abs(x) / Math.max(half, 0.01), 1), 2));
    const outer = hullSheerY(u) + crown;
    return outer + (0.155 - outer) * cockpitMask(x, z);
  }

  const geometryCache = new Map();

  function runtimeGeometry(key, positions, indices) {
    if (geometryCache.has(key)) return geometryCache.get(key);
    const geometry = new GeometryCtor();
    geometry.setAttribute(
      "position",
      new AttributeCtor(new Float32Array(positions), 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometryCache.set(key, geometry);
    return geometry;
  }

  function boxGeometry(width, height, depth) {
    const key = `box:${width}:${height}:${depth}`;
    const x = width / 2;
    const y = height / 2;
    const z = depth / 2;
    const positions = [
      -x, -y, z, x, -y, z, x, y, z, -x, y, z,
      x, -y, -z, -x, -y, -z, -x, y, -z, x, y, -z,
      -x, y, z, x, y, z, x, y, -z, -x, y, -z,
      -x, -y, -z, x, -y, -z, x, -y, z, -x, -y, z,
      x, -y, z, x, -y, -z, x, y, -z, x, y, z,
      -x, -y, -z, -x, -y, z, -x, y, z, -x, y, -z,
    ];
    const indices = [];
    for (let face = 0; face < 6; face++) {
      const i = face * 4;
      indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
    }
    return runtimeGeometry(key, positions, indices);
  }

  function cylinderGeometry(radius, height, radial = 18) {
    const key = `cyl:${radius}:${height}:${radial}`;
    if (geometryCache.has(key)) return geometryCache.get(key);
    const positions = [];
    const indices = [];
    for (let ring = 0; ring < 2; ring++) {
      const y = ring === 0 ? -height / 2 : height / 2;
      for (let i = 0; i < radial; i++) {
        const a = (i / radial) * Math.PI * 2;
        positions.push(Math.cos(a) * radius, y, Math.sin(a) * radius);
      }
    }
    for (let i = 0; i < radial; i++) {
      const next = (i + 1) % radial;
      indices.push(i, radial + i, next, next, radial + i, radial + next);
    }
    const bottom = positions.length / 3;
    positions.push(0, -height / 2, 0);
    const top = positions.length / 3;
    positions.push(0, height / 2, 0);
    for (let i = 0; i < radial; i++) {
      const next = (i + 1) % radial;
      indices.push(bottom, next, i, top, radial + i, radial + next);
    }
    return runtimeGeometry(key, positions, indices);
  }

  function torusGeometry(major, tube, radial = 18, tubular = 8) {
    const key = `torus:${major}:${tube}:${radial}:${tubular}`;
    if (geometryCache.has(key)) return geometryCache.get(key);
    const positions = [];
    const indices = [];
    for (let i = 0; i < radial; i++) {
      const u = (i / radial) * Math.PI * 2;
      for (let j = 0; j < tubular; j++) {
        const v = (j / tubular) * Math.PI * 2;
        const r = major + tube * Math.cos(v);
        positions.push(r * Math.cos(u), r * Math.sin(u), tube * Math.sin(v));
      }
    }
    for (let i = 0; i < radial; i++) {
      const ni = (i + 1) % radial;
      for (let j = 0; j < tubular; j++) {
        const nj = (j + 1) % tubular;
        const a = i * tubular + j;
        const b = ni * tubular + j;
        const c = ni * tubular + nj;
        const d = i * tubular + nj;
        indices.push(a, b, d, b, c, d);
      }
    }
    return runtimeGeometry(key, positions, indices);
  }

  function hardwareMaterial(color, roughness, metalness) {
    const material = sourceSample.mesh.material.clone();
    if (material.color) {
      if (typeof material.color.setHex === "function") material.color.setHex(color);
      else material.color.set(color);
    }
    material.map = null;
    material.roughness = roughness;
    material.metalness = metalness;
    material.transparent = false;
    material.opacity = 1;
    return material;
  }

  const materials = {
    blackPolymer: hardwareMaterial(0x11161b, 0.56, 0.08),
    darkMetal: hardwareMaterial(0x39434c, 0.31, 0.78),
    stainless: hardwareMaterial(0xc4ccd2, 0.24, 0.9),
    sheave: hardwareMaterial(0xd9d5c8, 0.46, 0.18),
    cam: hardwareMaterial(0xb79d60, 0.32, 0.68),
    red: hardwareMaterial(0x9e2f2d, 0.48, 0.2),
  };

  function meshOf(geometry, material, name) {
    const mesh = new MeshCtor(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function addBox(group, size, position, material, name) {
    const mesh = meshOf(boxGeometry(size[0], size[1], size[2]), material, name);
    mesh.position.set(position[0], position[1], position[2]);
    group.add(mesh);
    return mesh;
  }

  function addCylinder(group, radius, height, position, material, name) {
    const mesh = meshOf(cylinderGeometry(radius, height), material, name);
    mesh.position.set(position[0], position[1], position[2]);
    group.add(mesh);
    return mesh;
  }

  function addTorus(group, major, tube, position, material, name) {
    const mesh = meshOf(torusGeometry(major, tube), material, name);
    mesh.position.set(position[0], position[1], position[2]);
    group.add(mesh);
    return mesh;
  }

  function makeBlock(name, options = {}) {
    const diameter = options.diameter || 0.04;
    const sheaveCount = options.sheaves || 1;
    const radius = diameter / 2;
    const group = new GroupCtor();
    group.name = name;
    const length = diameter * (sheaveCount > 1 ? 2.65 : 1.65);
    const width = diameter * 0.78;
    const depth = diameter * 0.42;
    const cheekX = width * 0.5;
    const plateWidth = diameter * 0.11;

    addBox(
      group,
      [plateWidth, length, depth],
      [-cheekX, 0, 0],
      materials.blackPolymer,
      `${name}-port-cheek`,
    );
    addBox(
      group,
      [plateWidth, length, depth],
      [cheekX, 0, 0],
      materials.blackPolymer,
      `${name}-starboard-cheek`,
    );
    addBox(
      group,
      [width, diameter * 0.12, depth],
      [0, length * 0.39, 0],
      materials.darkMetal,
      `${name}-head-pin`,
    );
    addBox(
      group,
      [width, diameter * 0.11, depth],
      [0, -length * 0.39, 0],
      materials.darkMetal,
      `${name}-foot-pin`,
    );

    const sheavePivots = [];
    for (let i = 0; i < sheaveCount; i++) {
      const pivot = new GroupCtor();
      const y =
        sheaveCount === 1
          ? 0
          : (i - (sheaveCount - 1) / 2) * diameter * 0.96;
      pivot.position.y = y;
      const sheave = addCylinder(
        pivot,
        radius * (options.ratchet ? 1.08 : 0.94),
        width * 0.92,
        [0, 0, 0],
        options.ratchet ? materials.red : materials.sheave,
        `${name}-sheave-${i + 1}`,
      );
      sheave.rotation.z = Math.PI / 2;
      const hub = addCylinder(
        pivot,
        radius * 0.22,
        width * 1.08,
        [0, 0, 0],
        materials.stainless,
        `${name}-hub-${i + 1}`,
      );
      hub.rotation.z = Math.PI / 2;
      group.add(pivot);
      sheavePivots.push(pivot);
    }

    const headEye = addTorus(
      group,
      diameter * 0.22,
      diameter * 0.055,
      [0, length * 0.6, 0],
      materials.stainless,
      `${name}-head-eye`,
    );
    headEye.rotation.x = Math.PI / 2;
    if (options.becket) {
      const becket = addTorus(
        group,
        diameter * 0.18,
        diameter * 0.05,
        [0, -length * 0.6, 0],
        materials.stainless,
        `${name}-becket`,
      );
      becket.rotation.x = Math.PI / 2;
    }
    group.userData.sheavePivots = sheavePivots;
    group.userData.sheaveRadiusM = radius;
    return group;
  }

  function makeSwivelRatchet(name) {
    const group = new GroupCtor();
    group.name = name;
    addCylinder(group, 0.038, 0.012, [0, 0.006, 0], materials.darkMetal, `${name}-base`);
    addCylinder(group, 0.021, 0.018, [0, 0.021, 0], materials.stainless, `${name}-swivel`);
    const block = makeBlock(`${name}-ratchet-block`, {
      diameter: 0.048,
      sheaves: 1,
      ratchet: true,
    });
    block.position.y = 0.08;
    group.add(block);
    const guard = addTorus(
      group,
      0.034,
      0.004,
      [0, 0.064, 0],
      materials.stainless,
      `${name}-swivel-guard`,
    );
    guard.rotation.x = Math.PI / 2;
    group.userData.sheavePivots = block.userData.sheavePivots;
    group.userData.sheaveRadiusM = block.userData.sheaveRadiusM;
    return group;
  }

  function makeCamCleat(name, withFairlead = true) {
    const group = new GroupCtor();
    group.name = name;
    addBox(group, [0.078, 0.011, 0.058], [0, 0.006, 0], materials.darkMetal, `${name}-base`);
    for (const side of [-1, 1]) {
      const pivot = new GroupCtor();
      pivot.position.set(side * 0.022, 0.021, 0);
      const cam = addCylinder(
        pivot,
        0.016,
        0.018,
        [0, 0, 0],
        materials.cam,
        `${name}-cam-${side < 0 ? "port" : "starboard"}`,
      );
      for (let tooth = 0; tooth < 8; tooth++) {
        const a = (tooth / 8) * Math.PI * 2;
        const toothMesh = addBox(
          pivot,
          [0.005, 0.019, 0.0035],
          [Math.cos(a) * 0.017, 0, Math.sin(a) * 0.017],
          materials.stainless,
          `${name}-tooth-${side}-${tooth}`,
        );
        toothMesh.rotation.y = -a;
      }
      group.add(pivot);
      cam.userData.cleatCam = true;
    }
    if (withFairlead) {
      const fairlead = addTorus(
        group,
        0.035,
        0.004,
        [0, 0.034, 0.006],
        materials.stainless,
        `${name}-C-fairlead`,
      );
      fairlead.rotation.x = Math.PI / 2;
    }
    return group;
  }

  function makeClamCleat(name) {
    const group = new GroupCtor();
    group.name = name;
    addBox(group, [0.032, 0.012, 0.076], [0, 0, 0], materials.darkMetal, `${name}-base`);
    for (const side of [-1, 1]) {
      const jaw = addBox(
        group,
        [0.009, 0.021, 0.064],
        [side * 0.013, 0.013, 0],
        materials.cam,
        `${name}-V-jaw-${side}`,
      );
      jaw.rotation.z = side * -0.24;
    }
    for (let tooth = 0; tooth < 9; tooth++) {
      const z = -0.026 + tooth * 0.0065;
      addBox(
        group,
        [0.026, 0.004, 0.0026],
        [0, 0.025, z],
        materials.stainless,
        `${name}-tooth-${tooth}`,
      );
    }
    return group;
  }

  function makeEye(name, radius = 0.019) {
    const group = new GroupCtor();
    group.name = name;
    const eye = addTorus(
      group,
      radius,
      Math.max(0.0028, radius * 0.2),
      [0, 0, 0],
      materials.stainless,
      `${name}-ring`,
    );
    eye.rotation.x = Math.PI / 2;
    addBox(
      group,
      [radius * 1.7, 0.006, radius * 0.8],
      [0, -radius * 0.58, 0],
      materials.darkMetal,
      `${name}-deck-pad`,
    );
    return group;
  }

  function makeHalyardRack(name) {
    const group = new GroupCtor();
    group.name = name;
    addBox(group, [0.018, 0.31, 0.018], [0, 0, 0], materials.stainless, `${name}-spine`);
    for (let i = 0; i < 6; i++) {
      const y = -0.125 + i * 0.05;
      addBox(
        group,
        [0.065, 0.008, 0.013],
        [0.024, y, 0],
        materials.darkMetal,
        `${name}-horn-${i + 1}`,
      );
      const slot = addTorus(
        group,
        0.012,
        0.0028,
        [0.052, y, 0],
        materials.stainless,
        `${name}-slot-${i + 1}`,
      );
      slot.rotation.x = Math.PI / 2;
    }
    return group;
  }

  const hardwareRoot = new GroupCtor();
  hardwareRoot.name = "laser2-v16-procedural-rope-hardware";
  scene.add(hardwareRoot);

  const temp = {
    a: new Vec3(),
    b: new Vec3(),
    c: new Vec3(),
    d: new Vec3(),
    local: new Vec3(),
    direction: new Vec3(),
    side: new Vec3(),
    up: new Vec3(),
    wind: new Vec3(),
    nodeVelocity: new Vec3(),
  };

  function designToWorld(x, y, z, out) {
    temp.local.set(x, y, z);
    return core.helpers.designToWorld(temp.local, out);
  }

  function deckPoint(x, forwardM, liftM, out) {
    const z = -2.2 + forwardM;
    return designToWorld(x, deckY(x, z) + liftM, z, out);
  }

  function bodyAxis(x, y, z, out) {
    return out.set(x, y, z).applyQuaternion(body.quat).normalize();
  }

  function mastAt(heightM, out) {
    const coordinate = clamp(heightM / Math.max(rig.segLen, 1e-6), 0, rig.mast.length - 1);
    const low = Math.floor(coordinate);
    const high = Math.min(low + 1, rig.mast.length - 1);
    return out.copy(rig.mast[low].x).lerp(rig.mast[high].x, coordinate - low);
  }

  const boomStations = [0, cfg.boom.vangZ, 1.6, 2.7, cfg.boom.sheetZ];
  const aftMainsheetStationM = 2.7;
  function boomAt(distanceFromGooseneckM, out) {
    const distance = clamp(distanceFromGooseneckM, 0, boomStations[boomStations.length - 1]);
    let segment = 0;
    while (
      segment < boomStations.length - 2 &&
      distance > boomStations[segment + 1]
    ) {
      segment++;
    }
    const span = Math.max(1e-6, boomStations[segment + 1] - boomStations[segment]);
    return out
      .copy(rig.boom[segment].x)
      .lerp(rig.boom[segment + 1].x, (distance - boomStations[segment]) / span);
  }

  function mastUp(out) {
    return out.copy(rig.mast[1].x).sub(rig.mast[0].x).normalize();
  }

  function anchorParticle(particle) {
    return (out) => out.copy(particle.x || particle);
  }

  function anchorMast(heightM, sideOffsetM = 0, foreOffsetM = 0) {
    return (out) => {
      mastAt(heightM, out);
      if (sideOffsetM) {
        bodyAxis(1, 0, 0, temp.side);
        out.addScaledVector(temp.side, sideOffsetM);
      }
      if (foreOffsetM) {
        bodyAxis(0, 0, 1, temp.direction);
        out.addScaledVector(temp.direction, foreOffsetM);
      }
      return out;
    };
  }

  function anchorBoom(distanceM, dropM = 0) {
    return (out) => {
      boomAt(distanceM, out);
      if (dropM) out.addScaledVector(mastUp(temp.up), -dropM);
      return out;
    };
  }

  function anchorDeck(x, forwardM, liftM = 0.025) {
    return (out) => deckPoint(x, forwardM, liftM, out);
  }

  function anchorSourcePoint(name, index, fallback) {
    return (out) => {
      const source = sourceRopes[name];
      const point = source && source.pts && source.pts[index < 0 ? source.pts.length + index : index];
      if (point && source.initialized && Number.isFinite(point.x + point.y + point.z)) {
        return out.copy(point);
      }
      return fallback(out);
    };
  }

  function anchorHold(name, fallback) {
    return (out) => {
      const point = master.holds && master.holds[name];
      if (
        point &&
        Number.isFinite(point.x + point.y + point.z) &&
        point.lengthSq() > 1e-7
      ) {
        // V15 stores hand holds in the rendered boat group's local/design
        // frame. Convert exactly once here; treating them as world points made
        // every sheet tail jump when the hull translated or heeled.
        core.helpers.designToWorld(point, out);
        if (isDeckClearWorld(out, 0.014)) return out;
      }
      return fallback(out);
    };
  }

  function isDeckClearWorld(point, clearanceM) {
    core.helpers.worldToDesign(point, temp.local);
    if (temp.local.z < -2.2 || temp.local.z > 2.2) return true;
    const u = clamp((temp.local.z + 2.2) / 4.4, 0, 1);
    const half = hullHalfWidth(u);
    if (Math.abs(temp.local.x) > half + 0.035) return true;
    return temp.local.y >= deckY(temp.local.x, temp.local.z) + clearanceM;
  }

  const main = sails.main;
  const jib = sails.jib;
  const spin = sails.spin;
  const mainTack = main.cloth.parts[0][0];
  const mainClew = main.cloth.parts[0][main.cloth.cols - 1];
  const mainHead = main.cloth.parts[main.cloth.rows - 1][0];
  const jibHead = jib.cloth.parts[jib.cloth.rows - 1][0];
  const spinHead =
    spin.cloth.parts[spin.cloth.rows - 1][Math.floor(spin.cloth.cols / 2)];

  const anchors = {
    travellerPortEye: (out) =>
      core.helpers.designToWorld(rig.eyeDs[0], out),
    travellerStarboardEye: (out) =>
      core.helpers.designToWorld(rig.eyeDs[1], out),
    travellerApex: anchorParticle(rig.bridleApex),
    travellerCleat: anchorDeck(0.25, 0.94, 0.022),
    centreRatchet: anchorDeck(0, 0.85, 0.035),
    deckControlPort: anchorDeck(-0.28, 1.415, 0.025),
    deckControlStarboard: anchorDeck(0.28, 1.415, 0.025),
    spinFairleadPort: anchorDeck(-0.58, 1.765, 0.026),
    spinFairleadStarboard: anchorDeck(0.58, 1.765, 0.026),
    trapFairleadPort: anchorDeck(-0.58, 2.445, 0.022),
    trapFairleadStarboard: anchorDeck(0.58, 2.445, 0.022),
    jibFairleadPort: anchorDeck(-0.42, 2.65, 0.026),
    jibFairleadStarboard: anchorDeck(0.42, 2.65, 0.026),
    jibCamPort: anchorDeck(-0.42, 2.61, 0.035),
    jibCamStarboard: anchorDeck(0.42, 2.61, 0.035),
    // PROPOSED becket offset and aft-sheet station, distinct from the
    // builder-corrected 2.82 m physical boom endpoint.
    boomBecket: anchorBoom(aftMainsheetStationM - 0.04, 0.055),
    boomAftBlock: anchorBoom(aftMainsheetStationM, 0.06),
    boomUnderEye: anchorBoom(1.83, 0.05),
    boomForwardBlock: anchorBoom(1.34, 0.055),
    vangBoom: anchorBoom(cfg.boom.vangZ, 0.065),
    vangMast: (out) => mastAt(0.09, out).addScaledVector(bodyAxis(0, 0, -1, temp.direction), 0.04),
    outhaulClam: anchorBoom(0.36, 0.035),
    cunninghamClam: anchorMast(0.2, -0.052, -0.006),
    halyardRack: anchorMast(0.38, 0.06, -0.012),
    jibSheave: anchorMast(3.75, 0, 0.018),
    spinSheave: anchorMast(4.12, 0, 0.02),
    mainSheave: anchorMast(5.72, 0, 0.014),
    poleRing: anchorMast(cfg.spin.poleRingH, 0, -0.02),
    mainTack: anchorParticle(mainTack),
    mainClew: anchorParticle(mainClew),
    mainHead: anchorParticle(mainHead),
    jibClew: anchorParticle(jib.clew),
    jibHead: anchorParticle(jibHead),
    spinHead: anchorParticle(spinHead),
    spinClewPort: anchorParticle(spin.clewP),
    spinClewStarboard: anchorParticle(spin.clewS),
    poleOuter: anchorParticle(spin.poleOuter),
    hounds: anchorMast(4.21),
  };

  const hardware = {};
  const hardwareEntries = [];

  function registerHardware(name, group, anchor, options = {}) {
    group.name = `laser2-${name}`;
    hardwareRoot.add(group);
    const entry = {
      name,
      group,
      anchor,
      target: options.target || null,
      deckAligned: !!options.deckAligned,
      route: options.route || null,
      sheaveGain: options.sheaveGain || 1,
      wrapAngleRad: finite(options.wrapAngleRad, Math.PI),
      coreWrapIndex: Number.isInteger(options.coreWrapIndex)
        ? options.coreWrapIndex
        : null,
      anchorPoint: new Vec3(),
      targetPoint: new Vec3(),
      sheaveAngle: 0,
    };
    hardware[name] = entry;
    hardwareEntries.push(entry);
    return entry;
  }

  registerHardware(
    "traveller-block-40mm",
    makeBlock("traveller-block-40mm", { diameter: 0.04, sheaves: 1 }),
    anchors.travellerApex,
    { target: anchors.boomAftBlock, route: "mainsheet", coreWrapIndex: 0 },
  );
  registerHardware(
    "boom-aft-block-40mm-becket",
    makeBlock("boom-aft-block-40mm-becket", {
      diameter: 0.04,
      sheaves: 1,
      becket: true,
    }),
    anchors.boomAftBlock,
    {
      target: anchors.travellerApex,
      route: "mainsheet",
      sheaveGain: -1,
      coreWrapIndex: 1,
    },
  );
  registerHardware(
    "boom-forward-block-40mm",
    makeBlock("boom-forward-block-40mm", { diameter: 0.04, sheaves: 1 }),
    anchors.boomForwardBlock,
    { target: anchors.centreRatchet, route: "mainsheet", coreWrapIndex: 2 },
  );
  registerHardware(
    "centre-swivel-ratchet",
    makeSwivelRatchet("centre-swivel-ratchet"),
    anchors.centreRatchet,
    {
      deckAligned: true,
      route: "mainsheet",
      sheaveGain: -1,
      wrapAngleRad: params.ratchetWrapAngleRad,
    },
  );
  registerHardware(
    "jib-port-cam-C-cleat",
    makeCamCleat("jib-port-cam-C-cleat"),
    anchors.jibCamPort,
    { deckAligned: true },
  );
  registerHardware(
    "jib-starboard-cam-C-cleat",
    makeCamCleat("jib-starboard-cam-C-cleat"),
    anchors.jibCamStarboard,
    { deckAligned: true },
  );
  registerHardware(
    "spinnaker-port-cam-cleat",
    makeCamCleat("spinnaker-port-cam-cleat", false),
    anchors.deckControlPort,
    { deckAligned: true },
  );
  registerHardware(
    "spinnaker-starboard-cam-cleat",
    makeCamCleat("spinnaker-starboard-cam-cleat", false),
    anchors.deckControlStarboard,
    { deckAligned: true },
  );
  registerHardware(
    "traveller-V-cleat",
    makeClamCleat("traveller-V-cleat"),
    anchors.travellerCleat,
    { deckAligned: true },
  );
  registerHardware(
    "boom-outhaul-clam-cleat",
    makeClamCleat("boom-outhaul-clam-cleat"),
    anchors.outhaulClam,
    { target: anchorBoom(0.9), route: "outhaul" },
  );
  registerHardware(
    "mast-cunningham-clam-cleat",
    makeClamCleat("mast-cunningham-clam-cleat"),
    anchors.cunninghamClam,
    { target: anchorMast(0.7), route: "cunning" },
  );
  registerHardware(
    "vang-boom-double-40mm",
    makeBlock("vang-boom-double-40mm", { diameter: 0.04, sheaves: 2 }),
    anchors.vangBoom,
    { target: anchors.vangMast, route: "vang" },
  );
  const mastVangBlock = makeBlock("vang-mast-double-jammer-40mm", {
    diameter: 0.04,
    sheaves: 2,
    becket: true,
  });
  const mastVangJammer = makeClamCleat("vang-integral-jammer");
  mastVangJammer.position.set(0, -0.095, 0.025);
  mastVangBlock.add(mastVangJammer);
  registerHardware(
    "vang-mast-double-jammer-40mm",
    mastVangBlock,
    anchors.vangMast,
    { target: anchors.vangBoom, route: "vang", sheaveGain: -1 },
  );
  registerHardware(
    "mast-halyard-rack",
    makeHalyardRack("mast-halyard-rack"),
    anchors.halyardRack,
    { target: anchorMast(0.9) },
  );
  registerHardware(
    "jib-halyard-sheave-30mm",
    makeBlock("jib-halyard-sheave-30mm", { diameter: 0.03, sheaves: 1 }),
    anchors.jibSheave,
    { target: anchors.jibHead, route: "jibHalyard" },
  );
  registerHardware(
    "spinnaker-halyard-sheave-30mm",
    makeBlock("spinnaker-halyard-sheave-30mm", { diameter: 0.03, sheaves: 1 }),
    anchors.spinSheave,
    { target: anchors.spinHead, route: "spinnakerHalyard" },
  );
  registerHardware(
    "main-halyard-sheave-30mm",
    makeBlock("main-halyard-sheave-30mm", { diameter: 0.03, sheaves: 1 }),
    anchors.mainSheave,
    { target: anchors.mainHead, route: "mainHalyard" },
  );

  for (const [name, anchor] of [
    ["traveller-port-eye", anchors.travellerPortEye],
    ["traveller-starboard-eye", anchors.travellerStarboardEye],
    ["jib-port-fairlead", anchors.jibFairleadPort],
    ["jib-starboard-fairlead", anchors.jibFairleadStarboard],
    ["spinnaker-port-fairlead", anchors.spinFairleadPort],
    ["spinnaker-starboard-fairlead", anchors.spinFairleadStarboard],
    ["trapeze-port-shockcord-fairlead", anchors.trapFairleadPort],
    ["trapeze-starboard-shockcord-fairlead", anchors.trapFairleadStarboard],
  ]) {
    registerHardware(name, makeEye(name), anchor, { deckAligned: true });
  }

  function makeTubeGeometry(nodeCount, radialSegments) {
    const geometry = new GeometryCtor();
    geometry.setAttribute(
      "position",
      new AttributeCtor(new Float32Array(nodeCount * (radialSegments + 1) * 3), 3),
    );
    geometry.setAttribute(
      "normal",
      new AttributeCtor(new Float32Array(nodeCount * (radialSegments + 1) * 3), 3),
    );
    const indices = [];
    for (let n = 0; n < nodeCount - 1; n++) {
      for (let r = 0; r < radialSegments; r++) {
        const a = n * (radialSegments + 1) + r;
        const b = a + radialSegments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    geometry.setIndex(indices);
    return geometry;
  }

  function makeCustomRopeMesh(name, nodeCount, radius, color, radialSegments = 6) {
    const material = sourceSample.mesh.material.clone();
    if (material.color) {
      if (typeof material.color.setHex === "function") material.color.setHex(color);
      else material.color.set(color);
    }
    material.map = null;
    material.roughness = 0.82;
    material.metalness = 0;
    const mesh = new MeshCtor(
      makeTubeGeometry(nodeCount, radialSegments),
      material,
    );
    mesh.name = `laser2-v16-rope-${name}`;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    scene.add(mesh);
    return mesh;
  }

  const collisionScratch = {
    local: new Vec3(),
    closest: new Vec3(),
    delta: new Vec3(),
    axis: new Vec3(),
    corrected: new Vec3(),
  };

  function resolveCapsule(point, a, b, radius) {
    collisionScratch.axis.copy(b).sub(a);
    const lengthSq = collisionScratch.axis.lengthSq();
    let t = 0;
    if (lengthSq > 1e-10) {
      t = clamp(
        collisionScratch.delta.copy(point).sub(a).dot(collisionScratch.axis) / lengthSq,
        0,
        1,
      );
    }
    collisionScratch.closest.copy(a).addScaledVector(collisionScratch.axis, t);
    collisionScratch.delta.copy(point).sub(collisionScratch.closest);
    let distance = collisionScratch.delta.length();
    if (distance >= radius) return false;
    if (distance < 1e-8) {
      bodyAxis(1, 0, 0, collisionScratch.delta);
      distance = 1;
    }
    point
      .copy(collisionScratch.closest)
      .addScaledVector(collisionScratch.delta, radius / distance);
    return true;
  }

  function resolveMast(point, ropeRadius) {
    for (let i = 0; i < rig.mast.length - 1; i++) {
      const mastRadius =
        typeof core.helpers.mastRadiusAt === "function"
          ? core.helpers.mastRadiusAt((i + 0.5) / (rig.mast.length - 1))
          : 0.045 - 0.02 * ((i + 0.5) / (rig.mast.length - 1));
      if (
        resolveCapsule(
          point,
          rig.mast[i].x,
          rig.mast[i + 1].x,
          mastRadius + ropeRadius + params.collisionMarginM,
        )
      ) {
        metrics.mastCollisionCount++;
        metrics.collisionCount++;
        return true;
      }
    }
    return false;
  }

  function resolveBoom(point, ropeRadius) {
    for (let i = 0; i < rig.boom.length - 1; i++) {
      if (
        resolveCapsule(
          point,
          rig.boom[i].x,
          rig.boom[i + 1].x,
          0.038 + ropeRadius + params.collisionMarginM,
        )
      ) {
        metrics.boomCollisionCount++;
        metrics.collisionCount++;
        return true;
      }
    }
    return false;
  }

  function resolveDeck(point, ropeRadius, previous) {
    core.helpers.worldToDesign(point, collisionScratch.local);
    const local = collisionScratch.local;
    if (local.z < -2.22 || local.z > 2.22) return false;
    const u = clamp((local.z + 2.2) / 4.4, 0, 1);
    if (Math.abs(local.x) > hullHalfWidth(u) + 0.035) return false;
    const height = deckY(local.x, local.z) + ropeRadius + params.collisionMarginM;
    if (local.y >= height) return false;
    local.y = height;
    core.helpers.designToWorld(local, point);
    if (previous) previous.lerp(point, params.deckFriction);
    metrics.deckCollisionCount++;
    metrics.collisionCount++;
    return true;
  }

  const tubeScratch = {
    tangent: new Vec3(),
    normal: new Vec3(),
    binormal: new Vec3(),
    reference: new Vec3(0, 1, 0),
  };

  function writeTube(route) {
    const geometry = route.mesh.geometry;
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    if (!position || !normal) return;
    const positions = position.array;
    const normals = normal.array;
    const radial = route.radialSegments;
    for (let i = 0; i < route.nodeCount; i++) {
      const point = route.nodes[i].position;
      const next = route.nodes[Math.min(i + 1, route.nodeCount - 1)].position;
      const previous = route.nodes[Math.max(i - 1, 0)].position;
      tubeScratch.tangent.copy(next).sub(previous);
      if (tubeScratch.tangent.lengthSq() < 1e-12) tubeScratch.tangent.set(0, 1, 0);
      tubeScratch.tangent.normalize();
      tubeScratch.normal.copy(tubeScratch.reference).cross(tubeScratch.tangent);
      if (tubeScratch.normal.lengthSq() < 0.01) {
        tubeScratch.normal.set(1, 0, 0).cross(tubeScratch.tangent);
      }
      tubeScratch.normal.normalize();
      tubeScratch.binormal.crossVectors(tubeScratch.tangent, tubeScratch.normal);
      for (let r = 0; r <= radial; r++) {
        const angle = (r / radial) * Math.PI * 2;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const offset = (i * (radial + 1) + r) * 3;
        const nx =
          cosine * tubeScratch.normal.x + sine * tubeScratch.binormal.x;
        const ny =
          cosine * tubeScratch.normal.y + sine * tubeScratch.binormal.y;
        const nz =
          cosine * tubeScratch.normal.z + sine * tubeScratch.binormal.z;
        positions[offset] = point.x + nx * route.radius;
        positions[offset + 1] = point.y + ny * route.radius;
        positions[offset + 2] = point.z + nz * route.radius;
        normals[offset] = nx;
        normals[offset + 1] = ny;
        normals[offset + 2] = nz;
      }
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
    route.mesh.userData.v16DynamicRope = true;
    route.mesh.userData.v16Stretch01 = route.maxStretch01;
    route.mesh.userData.v16ProjectionResidual01 = route.projectionResidual01;
    route.mesh.userData.v16CollisionCount = route.collisionCount;
  }

  class DynamicRope {
    constructor(spec) {
      this.name = spec.name;
      this.source = spec.source ? sourceRopes[spec.source] : null;
      this.nodeCount = this.source ? this.source.n : spec.nodes;
      this.radialSegments = this.source
        ? this.source.rs ||
          Math.max(
            3,
            Math.round(
              this.source.mesh.geometry.attributes.position.count / this.source.n - 1,
            ),
          )
        : spec.radialSegments || 6;
      this.radius = this.source ? this.source.radius : spec.radius;
      this.anchors = spec.anchors;
      this.anchorPositions = this.anchors.map(() => new Vec3());
      this.goals = Array.from({ length: this.nodeCount }, () => new Vec3());
      this.nodes = Array.from({ length: this.nodeCount }, () => ({
        position: new Vec3(),
        previous: new Vec3(),
        inverseMass: 1,
        wetness: 0,
      }));
      this.restLengths = new Float64Array(this.nodeCount - 1);
      this.contactAllowances = new Float64Array(this.nodeCount - 1);
      this.lambdas = new Float64Array(this.nodeCount - 1);
      this.pins = new Uint8Array(this.nodeCount);
      this.nodeContacts = new Uint8Array(this.nodeCount);
      this.slackRatio = spec.slackRatio || 0;
      this.compliance = finite(spec.compliance, params.segmentComplianceMPerN);
      this.minimumMaterialLengthM = Math.max(
        0,
        finite(spec.minimumMaterialLengthM, 0),
      );
      this.maximumContactDetourAllowanceM = finite(
        spec.maximumContactDetourAllowanceM,
        params.maximumContactDetourAllowanceM,
      );
      this.activeFn = spec.active || null;
      this.mesh = this.source
        ? this.source.mesh
        : makeCustomRopeMesh(
            this.name,
            this.nodeCount,
            this.radius,
            spec.color || 0xe0ddd2,
            this.radialSegments,
          );
      this.customMesh = !this.source;
      this.initialized = false;
      this.maxStretch01 = 0;
      this.projectionResidual01 = 0;
      this.collisionCount = 0;
      this.lengthM = 0;
      this.previousGoalLengthM = 0;
      this.lineSpeedMps = 0;
      this.tensionN = 0;
      this.residualResets = 0;
      this.contactRestAdjustmentM = 0;
      this._segmentLengths = new Float64Array(this.anchors.length - 1);
      this._totalGoalLength = 0;
      if (this.source) metrics.sourceRoutesBound++;
      else metrics.customRoutes++;
    }

    isActive() {
      if (this.activeFn) return !!this.activeFn();
      if (this.source) return this.source.mesh.visible !== false;
      return true;
    }

    updateAnchors() {
      let total = 0;
      let largestJump = 0;
      for (let i = 0; i < this.anchors.length; i++) {
        const old = temp.a.copy(this.anchorPositions[i]);
        this.anchors[i](this.anchorPositions[i]);
        if (this.initialized) {
          largestJump = Math.max(largestJump, old.distanceTo(this.anchorPositions[i]));
        }
        if (i > 0) {
          const length = this.anchorPositions[i - 1].distanceTo(this.anchorPositions[i]);
          this._segmentLengths[i - 1] = length;
          total += length;
        }
      }
      this._totalGoalLength = total;
      if (largestJump > params.maximumAnchorJumpM) this.initialized = false;

      let segment = 0;
      let accumulated = 0;
      for (let node = 0; node < this.nodeCount; node++) {
        const targetDistance =
          this.nodeCount > 1 ? (total * node) / (this.nodeCount - 1) : 0;
        while (
          segment < this._segmentLengths.length - 1 &&
          accumulated + this._segmentLengths[segment] < targetDistance
        ) {
          accumulated += this._segmentLengths[segment];
          segment++;
        }
        const segmentLength = Math.max(1e-8, this._segmentLengths[segment] || 0);
        const t = clamp((targetDistance - accumulated) / segmentLength, 0, 1);
        this.goals[node]
          .copy(this.anchorPositions[segment])
          .lerp(this.anchorPositions[segment + 1], t);
      }

      this.pins.fill(0);
      let prefix = 0;
      let previousIndex = -1;
      for (let anchor = 0; anchor < this.anchorPositions.length; anchor++) {
        const remaining = this.anchorPositions.length - anchor - 1;
        let index =
          anchor === 0
            ? 0
            : anchor === this.anchorPositions.length - 1
              ? this.nodeCount - 1
              : Math.round((prefix / Math.max(total, 1e-8)) * (this.nodeCount - 1));
        index = clamp(index, previousIndex + 1, this.nodeCount - 1 - remaining);
        this.pins[index] = 1;
        this.goals[index].copy(this.anchorPositions[anchor]);
        previousIndex = index;
        if (anchor < this._segmentLengths.length) prefix += this._segmentLengths[anchor];
      }
      return total;
    }

    reset() {
      this.contactAllowances.fill(0);
      this.nodeContacts.fill(0);
      for (let i = 0; i < this.nodeCount; i++) {
        this.nodes[i].position.copy(this.goals[i]);
        this.nodes[i].previous.copy(this.goals[i]);
        this.nodes[i].inverseMass = this.pins[i] ? 0 : 1;
      }
      const routedLength = Math.max(
        1e-8,
        this._totalGoalLength * (1 + this.slackRatio),
      );
      const materialScale = Math.max(
        1,
        this.minimumMaterialLengthM / routedLength,
      );
      for (let i = 0; i < this.nodeCount - 1; i++) {
        this.restLengths[i] = Math.max(
          1e-5,
          this.goals[i].distanceTo(this.goals[i + 1]) *
            (1 + this.slackRatio) *
            materialScale,
        );
      }
      this.previousGoalLengthM = this._totalGoalLength;
      this.initialized = true;
    }

    pinGuides() {
      for (let i = 0; i < this.nodeCount; i++) {
        const node = this.nodes[i];
        node.inverseMass = this.pins[i] ? 0 : 1;
        if (this.pins[i]) {
          node.position.copy(this.goals[i]);
          node.previous.copy(this.goals[i]);
        }
      }
    }

    integrate(dt) {
      const dryDamping = Math.exp(-params.velocityDampingPerSecond * dt);
      const goalFollow = 1 - Math.exp(-params.goalFollowPerSecond * dt);
      const dt2 = dt * dt;
      for (let i = 0; i < this.nodeCount; i++) {
        const node = this.nodes[i];
        if (!node.inverseMass) continue;

        let submerged = false;
        if (master.water && typeof master.water.height === "function") {
          submerged =
            node.position.y < master.water.height(node.position.x, node.position.z);
        }
        node.wetness = clamp(
          node.wetness +
            (submerged ? params.wetPickupRate : -params.wetDrainRate) * dt,
          0,
          1,
        );
        const damping =
          dryDamping * Math.exp(-params.wetDampingPerSecond * node.wetness * dt);
        temp.nodeVelocity.copy(node.position).sub(node.previous).multiplyScalar(damping);
        node.previous.copy(node.position);
        node.position.add(temp.nodeVelocity);
        node.position.y -=
          params.gravityMps2 *
          params.dryGravityScale *
          (1 + params.wetWeightGain * node.wetness) *
          dt2;

        if (master.wind && typeof master.wind.velocityAt === "function") {
          master.wind.velocityAt(node.position, temp.wind);
          temp.nodeVelocity.copy(node.position).sub(node.previous).multiplyScalar(1 / dt);
          temp.wind.sub(temp.nodeVelocity);
          const relative = temp.wind.length();
          if (relative > 1e-6) {
            node.position.addScaledVector(
              temp.wind,
              params.windDragGain * routeDragScale(this.radius) * relative * dt2,
            );
          }
        }
        node.position.lerp(this.goals[i], goalFollow);
      }
    }

    strainLimitPinnedSpans() {
      const passes = Math.max(0, Math.floor(params.pinnedSpanStrainPasses));
      for (let pass = 0; pass < passes; pass++) {
        const reverse = pass % 2 === 1;
        for (let segment = 0; segment < this.nodeCount - 1; segment++) {
          const i = reverse ? this.nodeCount - 2 - segment : segment;
          const a = this.nodes[i];
          const b = this.nodes[i + 1];
          const weight = a.inverseMass + b.inverseMass;
          if (weight <= 0) continue;
          temp.direction.copy(b.position).sub(a.position);
          const distance = temp.direction.length();
          const rest = Math.max(this.restLengths[i], 1e-6);
          const extension = distance - rest;
          if (extension <= 0 || distance < 1e-9) continue;
          temp.direction.multiplyScalar(1 / distance);
          a.position.addScaledVector(
            temp.direction,
            (extension * a.inverseMass) / weight,
          );
          b.position.addScaledVector(
            temp.direction,
            (-extension * b.inverseMass) / weight,
          );
        }
        this.pinGuides();
      }
    }

    resolveCollisions() {
      for (let i = 1; i < this.nodeCount - 1; i++) {
        if (this.pins[i]) continue;
        const before = metrics.collisionCount;
        resolveMast(this.nodes[i].position, this.radius);
        resolveBoom(this.nodes[i].position, this.radius);
        resolveDeck(
          this.nodes[i].position,
          this.radius,
          this.nodes[i].previous,
        );
        if (metrics.collisionCount > before) this.nodeContacts[i] = 1;
        this.collisionCount += metrics.collisionCount - before;
      }
      this.pinGuides();
    }

    project(dt) {
      this.lambdas.fill(0);
      const alpha = this.compliance / Math.max(dt * dt, 1e-8);
      let residual = 0;
      for (let iteration = 0; iteration < params.xpbdIterations; iteration++) {
        residual = 0;
        const reverse = iteration % 2 === 1;
        for (let pass = 0; pass < this.nodeCount - 1; pass++) {
          const i = reverse ? this.nodeCount - 2 - pass : pass;
          const a = this.nodes[i];
          const b = this.nodes[i + 1];
          const weight = a.inverseMass + b.inverseMass;
          if (weight <= 0) continue;
          temp.direction.copy(b.position).sub(a.position);
          const distance = temp.direction.length();
          if (distance < 1e-9) continue;
          const rest = Math.max(this.restLengths[i], 1e-6);
          const constraint = distance - rest;
          residual = Math.max(residual, Math.abs(constraint) / rest);
          // Rope is unilateral: it carries tension but cannot carry
          // compression. Slack material must be free to fold between guides.
          if (constraint <= 0) {
            this.lambdas[i] = 0;
            continue;
          }
          const deltaLambda =
            (-constraint - alpha * this.lambdas[i]) / (weight + alpha);
          this.lambdas[i] += deltaLambda;
          temp.direction.multiplyScalar(1 / distance);
          a.position.addScaledVector(
            temp.direction,
            -a.inverseMass * deltaLambda,
          );
          b.position.addScaledVector(
            temp.direction,
            b.inverseMass * deltaLambda,
          );
        }

        this.resolveCollisions();
      }
      // Tension-only strain limiting can move a node back toward a collider.
      // Finish with alternating strain/contact cycles and make contact the last
      // operation so rendered nodes cannot end the frame inside mast/boom/deck.
      const closureCycles = Math.max(
        1,
        Math.floor(params.postCollisionClosureCycles),
      );
      for (let cycle = 0; cycle < closureCycles; cycle++) {
        this.strainLimitPinnedSpans();
        this.resolveCollisions();
      }
      residual = 0;
      for (let i = 0; i < this.nodeCount - 1; i++) {
        const rest = Math.max(this.restLengths[i], 1e-6);
        residual = Math.max(
          residual,
          Math.max(
            0,
            this.nodes[i].position.distanceTo(this.nodes[i + 1].position) - rest,
          ) / rest,
        );
      }
      this.projectionResidual01 = residual;
    }

    absorbContactDetours() {
      let adjustment = 0;
      for (let i = 0; i < this.nodeCount - 1; i++) {
        if (!this.nodeContacts[i] && !this.nodeContacts[i + 1]) continue;
        const distance = this.nodes[i].position.distanceTo(this.nodes[i + 1].position);
        const extension = distance - this.restLengths[i];
        if (extension <= 0) continue;
        const available = Math.max(
          0,
          this.maximumContactDetourAllowanceM - adjustment,
        );
        const accepted = Math.min(extension, available);
        this.contactAllowances[i] = accepted;
        this.restLengths[i] += accepted;
        adjustment += accepted;
      }
      this.contactRestAdjustmentM = this.contactAllowances.reduce(
        (total, value) => total + value,
        0,
      );
      if (adjustment <= 0) return;
      let residual = 0;
      for (let i = 0; i < this.nodeCount - 1; i++) {
        const distance = this.nodes[i].position.distanceTo(this.nodes[i + 1].position);
        const rest = Math.max(this.restLengths[i], 1e-6);
        residual = Math.max(residual, Math.max(0, distance - rest) / rest);
      }
      this.projectionResidual01 = residual;
    }

    update(dt) {
      const active = this.isActive();
      if (this.customMesh) this.mesh.visible = active;
      if (!active) return false;

      const goalLength = this.updateAnchors();
      if (!this.initialized) this.reset();
      this.lineSpeedMps = clamp(
        (goalLength - this.previousGoalLengthM) / dt,
        -12,
        12,
      );
      this.previousGoalLengthM = goalLength;

      // The authoritative trim system already determines route scope. Display
      // segment rest lengths follow that post-core route immediately; inertia
      // remains in node positions, not in a fictitious delayed rope stretch.
      const restFollow = 1;
      // Contact allowance is a current-frame geometric detour budget, not
      // stored rope or a ratcheting source of line length.
      this.contactAllowances.fill(0);
      this.contactRestAdjustmentM = 0;
      const routedLength = Math.max(
        1e-8,
        this._totalGoalLength * (1 + this.slackRatio),
      );
      const materialScale = Math.max(
        1,
        this.minimumMaterialLengthM / routedLength,
      );
      for (let i = 0; i < this.nodeCount - 1; i++) {
        const target = Math.max(
          1e-5,
          this.goals[i].distanceTo(this.goals[i + 1]) *
            (1 + this.slackRatio) *
            materialScale +
            this.contactAllowances[i],
        );
        this.restLengths[i] += (target - this.restLengths[i]) * restFollow;
      }

      this.collisionCount = 0;
      this.nodeContacts.fill(0);
      this.integrate(dt);
      this.pinGuides();
      this.project(dt);
      this.absorbContactDetours();
      if (this.projectionResidual01 > params.maximumResidualBeforeReset01) {
        // A reset, capsize or rapid contact-side change can leave a visual line
        // wrapped on the stale side of the hull even while its anchors move
        // continuously. Re-seed from the current routed anchors regardless of
        // whether the bad state also reports contact; retaining that trapped
        // branch can otherwise masquerade as hundreds of percent rope strain.
        this.reset();
        this.project(dt);
        this.absorbContactDetours();
        this.residualResets++;
      }

      this.maxStretch01 = 0;
      this.lengthM = 0;
      for (let i = 0; i < this.nodeCount - 1; i++) {
        const distance = this.nodes[i].position.distanceTo(this.nodes[i + 1].position);
        const rest = Math.max(this.restLengths[i], 1e-6);
        this.lengthM += distance;
        this.maxStretch01 = Math.max(
          this.maxStretch01,
          Math.max(0, distance - rest) / rest,
        );
      }
      this.tensionN = estimateRouteTension(this);
      writeTube(this);
      return true;
    }
  }

  function routeDragScale(radius) {
    return clamp(radius / 0.006, 0.4, 2.4);
  }

  function positiveTension(value) {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function maximumConstraintTension(items) {
    if (!items) return 0;
    const values = Array.isArray(items) ? items : [items];
    let maximum = 0;
    for (const item of values) {
      if (!item) continue;
      maximum = Math.max(
        maximum,
        positiveTension(item.tension),
        positiveTension(item.workingTensionN),
      );
    }
    return maximum;
  }

  function estimateRouteTension(route) {
    switch (route.name) {
      case "mainsheet":
        return maximumConstraintTension(rig.sheetC);
      case "bridle":
      case "travellerTail":
        return maximumConstraintTension(rig.bridleLegs);
      case "vang":
      case "vangTail":
        return maximumConstraintTension(rig.vangC);
      case "jibPort":
        return maximumConstraintTension(jib.sheetCs && jib.sheetCs[0]);
      case "jibStarboard":
        return maximumConstraintTension(jib.sheetCs && jib.sheetCs[1]);
      case "spinnakerPort":
        return maximumConstraintTension(spin.sheetCs && spin.sheetCs[0]);
      case "spinnakerStarboard":
        return maximumConstraintTension(spin.sheetCs && spin.sheetCs[1]);
      case "jibHalyard":
        return Math.max(0, core.metrics?.().loads?.jibHalyardN || 0);
      default:
        return route.source
          ? positiveTension(route.source.estimatedLoadN)
          : Math.max(0, route.maxStretch01 * 6500);
    }
  }

  const activeSpin = () =>
    !!(core.helpers?.isSpinnakerPhysical?.() || (spin.state && spin.state.up));
  const mainsheetTailFallback = anchorDeck(-0.22, 1.08, 0.28);
  const jibTailPortFallback = anchorDeck(-0.2, 2.0, 0.26);
  const jibTailStarboardFallback = anchorDeck(0.2, 2.0, 0.26);
  const kiteTailPortFallback = anchorDeck(-0.24, 1.35, 0.24);
  const kiteTailStarboardFallback = anchorDeck(0.24, 1.35, 0.24);
  const vangTailFallback = anchorMast(0.18, 0.14, -0.04);
  const halyardTailPort = anchorMast(0.18, -0.12, -0.03);
  const halyardTailStarboard = anchorMast(0.18, 0.12, -0.03);

  const routeSpecs = [
    {
      name: "mainsheet",
      source: "mainsheet",
      anchors: [
        anchors.boomBecket,
        anchors.travellerApex,
        anchors.boomAftBlock,
        anchors.boomUnderEye,
        anchors.boomForwardBlock,
        anchors.centreRatchet,
        anchorHold("mainsheet", mainsheetTailFallback),
      ],
      slackRatio: 0.004,
    },
    {
      name: "bridle",
      source: "bridle",
      anchors: [
        anchors.travellerPortEye,
        anchors.travellerApex,
        anchors.travellerStarboardEye,
      ],
      slackRatio: 0.002,
    },
    {
      name: "travellerTail",
      nodes: 12,
      radius: 0.0045,
      color: 0xd8c95a,
      anchors: [
        anchors.travellerStarboardEye,
        anchors.travellerCleat,
        anchorDeck(0.12, 1.04, 0.16),
      ],
      slackRatio: 0.03,
    },
    {
      name: "vang",
      source: "vang",
      anchors: [anchors.vangMast, anchors.vangBoom, anchors.vangMast, anchors.vangBoom],
      slackRatio: 0.001,
    },
    {
      name: "vangTail",
      source: "vang2",
      anchors: [anchors.vangBoom, anchors.vangMast, vangTailFallback],
      slackRatio: 0.006,
    },
    {
      name: "jibPort",
      source: "jibP",
      anchors: [
        anchors.jibClew,
        anchors.jibFairleadPort,
        anchors.jibCamPort,
        anchorHold("jib", jibTailPortFallback),
      ],
      slackRatio: 0.012,
      // The 1997 Laser II Regatta rigging manual specifies one 7.0 m jib
      // sheet. These two visual branches each retain one supported-derived
      // 3.5 m half, so capsize routing consumes real free line rather than
      // being misreported as axial stretch.
      minimumMaterialLengthM: 3.5,
    },
    {
      name: "jibStarboard",
      source: "jibS",
      anchors: [
        anchors.jibClew,
        anchors.jibFairleadStarboard,
        anchors.jibCamStarboard,
        anchorHold("jib", jibTailStarboardFallback),
      ],
      slackRatio: 0.012,
      minimumMaterialLengthM: 3.5,
    },
    {
      name: "outhaul",
      source: "outhaul",
      anchors: [
        anchorBoom(cfg.boom.sheetZ - 0.04, 0.02),
        anchors.mainClew,
        anchors.outhaulClam,
        anchorBoom(0.18, 0.12),
      ],
      slackRatio: 0.002,
    },
    {
      name: "cunningham",
      source: "cunning",
      anchors: [
        anchors.mainTack,
        anchorMast(0.48, -0.025, -0.01),
        anchors.cunninghamClam,
        anchorMast(0.12, -0.12, -0.025),
      ],
      slackRatio: 0.004,
    },
    {
      name: "trapezePort",
      source: "trapP",
      anchors: [
        anchors.hounds,
        anchorSourcePoint("trapP", -1, anchors.trapFairleadPort),
      ],
      slackRatio: 0.008,
    },
    {
      name: "trapezeStarboard",
      source: "trapS",
      anchors: [
        anchors.hounds,
        anchorSourcePoint("trapS", -1, anchors.trapFairleadStarboard),
      ],
      slackRatio: 0.008,
    },
    {
      name: "trapShockPort",
      nodes: 10,
      radius: 0.0025,
      color: 0x20272c,
      anchors: [
        anchorSourcePoint("trapP", -1, anchors.trapFairleadPort),
        anchors.trapFairleadPort,
        anchorDeck(0.2, 2.43, 0.16),
      ],
      slackRatio: 0.06,
    },
    {
      name: "trapShockStarboard",
      nodes: 10,
      radius: 0.0025,
      color: 0x20272c,
      anchors: [
        anchorSourcePoint("trapS", -1, anchors.trapFairleadStarboard),
        anchors.trapFairleadStarboard,
        anchorDeck(-0.2, 2.43, 0.16),
      ],
      slackRatio: 0.06,
    },
    {
      name: "spinnakerHalyard",
      source: "kiteHal",
      anchors: [anchors.spinHead, anchors.spinSheave, anchors.halyardRack, halyardTailPort],
      slackRatio: 0.008,
      active: activeSpin,
    },
    {
      name: "spinnakerPort",
      source: "kiteP",
      anchors: [
        anchors.spinClewPort,
        anchors.spinFairleadPort,
        anchors.deckControlPort,
        anchorHold("kite", kiteTailPortFallback),
      ],
      slackRatio: 0.025,
      active: activeSpin,
    },
    {
      name: "spinnakerStarboard",
      source: "kiteS",
      anchors: [
        anchors.spinClewStarboard,
        anchors.spinFairleadStarboard,
        anchors.deckControlStarboard,
        anchorHold("kite", kiteTailStarboardFallback),
      ],
      slackRatio: 0.025,
      active: activeSpin,
    },
    {
      name: "poleUp",
      source: "poleUp",
      anchors: [anchors.poleRing, anchors.poleOuter],
      slackRatio: 0.002,
      active: activeSpin,
    },
    {
      name: "jibHalyard",
      nodes: 22,
      radius: 0.0035,
      color: 0xd3c54e,
      anchors: [anchors.jibHead, anchors.jibSheave, anchors.halyardRack, halyardTailStarboard],
      slackRatio: 0.004,
    },
    {
      name: "mainHalyard",
      nodes: 28,
      radius: 0.0035,
      color: 0xe8e5db,
      anchors: [anchors.mainHead, anchors.mainSheave, anchors.halyardRack, halyardTailPort],
      slackRatio: 0.003,
    },
  ];

  const ropes = {};
  for (const spec of routeSpecs) {
    const rope = new DynamicRope(spec);
    ropes[rope.name] = rope;
  }

  class CleatStateMachine {
    constructor(id, options) {
      this.id = id;
      this.state = "free";
      this.capacityN = options.capacityN;
      this.minimumSetLoadN = options.minimumSetLoadN || 8;
      this.armAngleRad = options.armAngleRad || 0.35;
      this.releaseAngleRad = options.releaseAngleRad || 0.15;
      this.slipSpeedMps = options.slipSpeedMps || 0.18;
      this.recoverRatio = options.recoverRatio || 0.78;
      this.timer = 0;
      this.requested = "arm";
      this.telemetry = {
        state: this.state,
        loadN: 0,
        entryTensionN: 0,
        exitTensionN: 0,
        lineSpeedMps: 0,
        direction: "static",
        capstanRatio: 1,
        wrapAngleRad: 0,
        ratchetEngaged: false,
        capacityN: this.capacityN,
        model: "diagnostic lumped directional holding model",
      };
    }

    command(command) {
      if (!["free", "arm", "hold", "release"].includes(command)) return false;
      this.requested = command;
      if (command === "free") this.transition("free");
      if (command === "arm") this.transition("armed");
      if (command === "hold") this.transition("held");
      if (command === "release") this.transition("released");
      return true;
    }

    transition(next) {
      if (this.state === next) return;
      this.state = next;
      this.timer = 0;
    }

    update(dt, input) {
      this.timer += dt;
      const load = positiveTension(input.loadN);
      const speed = finite(input.lineSpeedMps);
      const angle = Math.max(0, finite(input.entryAngleRad));

      if (this.requested === "release" && this.state !== "released") {
        this.transition("released");
      } else if (this.requested === "free" && this.state !== "free") {
        this.transition("free");
      } else {
        switch (this.state) {
          case "free":
            if (
              this.requested === "arm" &&
              angle >= this.armAngleRad &&
              load >= this.minimumSetLoadN
            ) {
              this.transition("armed");
            }
            break;
          case "armed":
            if (this.requested === "release" || angle < this.releaseAngleRad) {
              this.transition("released");
            } else if (load >= this.minimumSetLoadN && this.timer > 0.1) {
              this.transition("held");
            }
            break;
          case "held":
            if (this.requested === "release" || angle < this.releaseAngleRad) {
              this.transition("released");
            } else if (
              load > this.capacityN ||
              (speed > this.slipSpeedMps && load > this.capacityN * 0.55)
            ) {
              this.transition("slipping");
            }
            break;
          case "slipping":
            if (this.requested === "release" || angle < this.releaseAngleRad) {
              this.transition("released");
            } else if (
              load < this.capacityN * this.recoverRatio &&
              Math.abs(speed) < this.slipSpeedMps * 0.55 &&
              this.timer > 0.08
            ) {
              this.transition("held");
            }
            break;
          case "released":
            if (this.requested === "arm" && this.timer > 0.12) {
              this.transition("armed");
            } else if (this.requested === "free" && this.timer > 0.08) {
              this.transition("free");
            }
            break;
        }
      }

      const capstanRatio = clamp(
        Math.exp(finite(input.frictionCoefficient) * finite(input.wrapAngleRad)),
        1,
        params.maxDiagnosticCapstanRatio,
      );
      const ratchetEngaged =
        !!input.ratchet && speed > 0 && !["free", "released"].includes(this.state);
      const effectiveRatio = ratchetEngaged ? capstanRatio : 1;
      this.telemetry = {
        state: this.state,
        loadN: load,
        entryTensionN: load,
        exitTensionN: load / effectiveRatio,
        lineSpeedMps: speed,
        direction: speed < -0.005 ? "haul" : speed > 0.005 ? "ease" : "static",
        capstanRatio: effectiveRatio,
        wrapAngleRad: finite(input.wrapAngleRad),
        ratchetEngaged,
        capacityN: this.capacityN,
        model: "diagnostic lumped directional holding model",
      };
      return this.telemetry;
    }
  }

  const cleats = {
    mainsheetRatchet: new CleatStateMachine("mainsheetRatchet", {
      capacityN: 950,
      minimumSetLoadN: 10,
      armAngleRad: 0.22,
    }),
    jibPort: new CleatStateMachine("jibPort", { capacityN: 720 }),
    jibStarboard: new CleatStateMachine("jibStarboard", { capacityN: 720 }),
    traveller: new CleatStateMachine("traveller", { capacityN: 520 }),
    vangJammer: new CleatStateMachine("vangJammer", { capacityN: 1100 }),
    outhaul: new CleatStateMachine("outhaul", { capacityN: 480 }),
    cunningham: new CleatStateMachine("cunningham", { capacityN: 520 }),
    spinnakerPort: new CleatStateMachine("spinnakerPort", { capacityN: 560 }),
    spinnakerStarboard: new CleatStateMachine("spinnakerStarboard", { capacityN: 560 }),
  };

  function updateCleats(dt) {
    const definitions = {
      mainsheetRatchet: {
        route: ropes.mainsheet,
        angle: params.ratchetWrapAngleRad,
        mu: params.ratchetFrictionCoefficient,
        ratchet: true,
      },
      jibPort: { route: ropes.jibPort, angle: 0.62, mu: 0.42 },
      jibStarboard: { route: ropes.jibStarboard, angle: 0.62, mu: 0.42 },
      traveller: { route: ropes.travellerTail, angle: 0.54, mu: 0.4 },
      vangJammer: { route: ropes.vangTail, angle: 0.72, mu: 0.46 },
      outhaul: { route: ropes.outhaul, angle: 0.52, mu: 0.43 },
      cunningham: { route: ropes.cunningham, angle: 0.55, mu: 0.43 },
      spinnakerPort: { route: ropes.spinnakerPort, angle: 0.55, mu: 0.4 },
      spinnakerStarboard: {
        route: ropes.spinnakerStarboard,
        angle: 0.55,
        mu: 0.4,
      },
    };
    for (const [id, cleat] of Object.entries(cleats)) {
      const definition = definitions[id];
      const route = definition.route;
      metrics.cleatTelemetry[id] = cleat.update(dt, {
        loadN: route ? route.tensionN : 0,
        lineSpeedMps: route ? route.lineSpeedMps : 0,
        entryAngleRad: definition.angle,
        wrapAngleRad: definition.angle,
        frictionCoefficient: definition.mu,
        ratchet: definition.ratchet,
      });
    }
  }

  function updateHardware(dt) {
    const localY = new Vec3(0, 1, 0);
    for (const entry of hardwareEntries) {
      entry.anchor(entry.anchorPoint);
      entry.group.position.copy(entry.anchorPoint);
      if (entry.deckAligned) {
        entry.group.quaternion.copy(body.quat);
      } else if (entry.target) {
        entry.target(entry.targetPoint);
        temp.direction.copy(entry.targetPoint).sub(entry.anchorPoint);
        if (temp.direction.lengthSq() > 1e-10) {
          temp.direction.normalize();
          entry.group.quaternion.setFromUnitVectors(localY, temp.direction);
        }
      }
      const route = entry.route && ropes[entry.route];
      const pivots = entry.group.userData.sheavePivots || [];
      if (route && pivots.length) {
        const radius = Math.max(0.008, entry.group.userData.sheaveRadiusM || 0.02);
        entry.sheaveAngle +=
          (entry.sheaveGain * route.lineSpeedMps * dt) / radius;
        for (let i = 0; i < pivots.length; i++) {
          pivots[i].rotation.x = entry.sheaveAngle * (i % 2 ? -1 : 1);
        }
        metrics.sheaveRotationRad = Math.max(
          metrics.sheaveRotationRad,
          Math.abs(entry.sheaveAngle),
        );
        const coreWrap =
          entry.coreWrapIndex !== null &&
          rig.sheetC &&
          Array.isArray(rig.sheetC.wrapAngles)
            ? rig.sheetC.wrapAngles[entry.coreWrapIndex]
            : null;
        const wrapAngleRad = Number.isFinite(coreWrap)
          ? coreWrap
          : entry.wrapAngleRad;
        metrics.pulleyTelemetry[entry.name] = {
          sheaveCount: pivots.length,
          wrapAngleRad,
          rotationRad: entry.sheaveAngle,
          lineSpeedMps: route.lineSpeedMps,
          coreOrEstimatedTensionN: route.tensionN,
          tensionRatio: 1,
          sheaveModel:
            entry.route === "mainsheet" && rig.sheetC
              ? rig.sheetC.sheaveModel
              : "visual free-running sheave",
          contactModel: "pinned route guide with mast/boom/deck collision pass",
        };
      }
    }
  }

  let ui = null;
  function buildUI() {
    if (!document || !document.body) return null;
    const details = document.createElement("details");
    details.id = "laser2-rope-hardware-v16-panel";
    details.style.cssText = [
      "position:fixed",
      "right:12px",
      "bottom:12px",
      "z-index:10020",
      "width:min(390px,calc(100vw - 24px))",
      "max-height:55vh",
      "overflow:auto",
      "padding:8px 10px",
      "border:1px solid rgba(190,210,224,.34)",
      "border-radius:8px",
      "background:rgba(8,14,20,.88)",
      "color:#eaf3f8",
      "font:12px/1.35 system-ui,sans-serif",
      "box-shadow:0 8px 30px rgba(0,0,0,.35)",
    ].join(";");
    const summary = document.createElement("summary");
    summary.textContent = "Laser II rope + hardware V16";
    summary.style.cssText = "cursor:pointer;font-weight:700;letter-spacing:.02em";
    details.appendChild(summary);
    const note = document.createElement("div");
    note.textContent = "Visual XPBD + diagnostic cleat loads (core forces unchanged)";
    note.style.cssText = "margin:7px 0;color:#9fb3c1";
    details.appendChild(note);
    const readout = document.createElement("div");
    readout.style.cssText = "margin-bottom:7px;color:#cde2ee";
    details.appendChild(readout);
    const table = document.createElement("table");
    table.style.cssText = "width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums";
    const head = document.createElement("thead");
    head.innerHTML = "<tr><th style='text-align:left'>Cleat</th><th>State</th><th>Load</th><th>Line</th><th></th></tr>";
    table.appendChild(head);
    const tbody = document.createElement("tbody");
    const rows = {};
    for (const id of Object.keys(cleats)) {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      name.textContent = id;
      name.style.padding = "3px 2px";
      const state = document.createElement("td");
      state.style.cssText = "padding:3px 2px;text-align:center";
      const load = document.createElement("td");
      load.style.cssText = "padding:3px 2px;text-align:right";
      const line = document.createElement("td");
      line.style.cssText = "padding:3px 2px;text-align:right";
      const action = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "release";
      button.style.cssText = "font:inherit;padding:1px 5px;cursor:pointer";
      button.addEventListener("click", () => {
        const cleat = cleats[id];
        cleat.command(cleat.state === "released" ? "arm" : "release");
        button.textContent = cleat.state === "released" ? "arm" : "release";
      });
      action.appendChild(button);
      row.append(name, state, load, line, action);
      tbody.appendChild(row);
      rows[id] = { state, load, line, button };
    }
    table.appendChild(tbody);
    details.appendChild(table);
    document.body.appendChild(details);
    return { root: details, readout, rows };
  }

  function updateUI() {
    if (!ui) return;
    ui.readout.textContent =
      `${metrics.activeRopes} active ropes · ${metrics.collisionCount} contacts · ` +
      `stretch ${(metrics.maxStretch01 * 100).toFixed(2)}% · ` +
      `${metrics.updateMs.toFixed(2)} ms`;
    for (const [id, row] of Object.entries(ui.rows)) {
      const telemetry = metrics.cleatTelemetry[id];
      if (!telemetry) continue;
      row.state.textContent = telemetry.state;
      row.load.textContent = `${telemetry.loadN.toFixed(0)} N`;
      row.line.textContent = `${telemetry.direction} ${Math.abs(telemetry.lineSpeedMps).toFixed(2)}`;
      row.button.textContent = telemetry.state === "released" ? "arm" : "release";
    }
  }

  ui = buildUI();
  let uiClock = 0;

  function updateFrame(dt) {
    const start = performance.now();
    const step = clamp(finite(dt, 1 / 60), 1 / 240, params.maximumStepSeconds);
    metrics.activeRopes = 0;
    metrics.collisionCount = 0;
    metrics.mastCollisionCount = 0;
    metrics.boomCollisionCount = 0;
    metrics.deckCollisionCount = 0;
    metrics.maxStretch01 = 0;
    metrics.maxProjectionResidual01 = 0;
    metrics.maxLineSpeedMps = 0;
    metrics.residualResetCount = 0;
    metrics.maxContactRestAdjustmentM = 0;
    metrics.wetNodeFraction = 0;
    metrics.sheaveRotationRad = 0;
    let wetNodes = 0;
    let totalNodes = 0;

    for (const route of Object.values(ropes)) {
      if (!route.update(step)) {
        metrics.routeTelemetry[route.name] = {
          active: false,
          binding: route.source ? "exported core rope mesh" : "V16 supplemental route",
        };
        continue;
      }
      metrics.activeRopes++;
      metrics.maxStretch01 = Math.max(metrics.maxStretch01, route.maxStretch01);
      metrics.maxProjectionResidual01 = Math.max(
        metrics.maxProjectionResidual01,
        route.projectionResidual01,
      );
      metrics.maxLineSpeedMps = Math.max(
        metrics.maxLineSpeedMps,
        Math.abs(route.lineSpeedMps),
      );
      metrics.residualResetCount += route.residualResets;
      metrics.maxContactRestAdjustmentM = Math.max(
        metrics.maxContactRestAdjustmentM,
        route.contactRestAdjustmentM,
      );
      for (const node of route.nodes) {
        wetNodes += node.wetness;
        totalNodes++;
      }
      metrics.routeTelemetry[route.name] = {
        active: true,
        lengthM: route.lengthM,
        lineSpeedMps: route.lineSpeedMps,
        estimatedOrCoreTensionN: route.tensionN,
        maxStretch01: route.maxStretch01,
        projectionResidual01: route.projectionResidual01,
        collisionCount: route.collisionCount,
        residualResets: route.residualResets,
        contactRestAdjustmentM: route.contactRestAdjustmentM,
        contactDetourAllowanceLimitM: route.maximumContactDetourAllowanceM,
        minimumMaterialLengthM: route.minimumMaterialLengthM,
        geometricAnchorRouteLengthM: route._totalGoalLength,
        materialTargetLengthM: Math.max(
          route._totalGoalLength * (1 + route.slackRatio),
          route.minimumMaterialLengthM,
        ),
        materialSlackReserveM:
          Math.max(
            route._totalGoalLength * (1 + route.slackRatio),
            route.minimumMaterialLengthM,
          ) - route._totalGoalLength,
        binding: route.source ? "exported core rope mesh" : "V16 supplemental route",
      };
    }
    metrics.wetNodeFraction = totalNodes ? wetNodes / totalNodes : 0;
    updateCleats(step);
    updateHardware(step);
    metrics.updateMs = performance.now() - start;
    uiClock += step;
    if (uiClock > 0.2) {
      uiClock = 0;
      updateUI();
    }
  }

  function numericMetricsAreFinite() {
    const stack = [metrics];
    while (stack.length) {
      const value = stack.pop();
      if (!value || typeof value !== "object") continue;
      for (const entry of Object.values(value)) {
        if (typeof entry === "number" && !Number.isFinite(entry)) return false;
        if (entry && typeof entry === "object") stack.push(entry);
      }
    }
    return true;
  }

  function frame(dt) {
    try {
      updateFrame(dt);
      state.frame++;
      state.finite = numericMetricsAreFinite();
      state.lastError = state.finite ? null : "non-finite rope/hardware telemetry";
    } catch (error) {
      state.finite = false;
      state.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  function metricsSnapshot() {
    return {
      version: VERSION,
      enabled: state.initialized,
      finite: state.finite,
      lastError: state.lastError,
      frame: state.frame,
      truthBoundary: {
        forceAuthority: receipt.forceAuthority,
        statement: receipt.forceModelStatement,
        sourceBinding: receipt.sourceBinding,
      },
      ...metrics,
      routeTelemetry: { ...metrics.routeTelemetry },
      cleatTelemetry: { ...metrics.cleatTelemetry },
      pulleyTelemetry: { ...metrics.pulleyTelemetry },
    };
  }

  const previousLabMetrics = window.__labMetrics;
  function ropeLabMetricsWrapper() {
    const base =
      typeof previousLabMetrics === "function" ? previousLabMetrics() : {};
    return { ...base, ropeHardwareV16: metricsSnapshot() };
  }
  window.__labMetrics = ropeLabMetricsWrapper;

  const hooks = (window.LASER2_FRAME_HOOKS = window.LASER2_FRAME_HOOKS || []);
  hooks.push(frame);

  function resetVisualRopes() {
    for (const rope of Object.values(ropes)) {
      rope.initialized = false;
      rope.maxStretch01 = 0;
      rope.projectionResidual01 = 0;
      rope.collisionCount = 0;
      rope.lengthM = 0;
      rope.previousGoalLengthM = 0;
      rope.lineSpeedMps = 0;
      rope.tensionN = 0;
      rope.residualResets = 0;
      rope.contactRestAdjustmentM = 0;
      rope.contactAllowances.fill(0);
      rope.lambdas.fill(0);
      rope.nodeContacts.fill(0);
      for (const node of rope.nodes) node.wetness = 0;
    }
  }

  const sim = window.__sim;
  const previousSimReset = typeof sim?.reset === "function" ? sim.reset : null;
  const wrappedSimReset = previousSimReset
    ? function (...args) {
        const result = previousSimReset.apply(sim, args);
        resetVisualRopes();
        return result;
      }
    : null;
  if (wrappedSimReset) sim.reset = wrappedSimReset;

  const api = {
    VERSION,
    state,
    params,
    metrics: metricsSnapshot,
    metricsState: metrics,
    receipt,
    ropeSystem: ropeSystemExport,
    sourceRopes,
    ropes,
    hardware,
    cleats,
    ui,
    commandCleat(id, command) {
      return !!cleats[id] && cleats[id].command(command);
    },
    setParam(name, value) {
      if (!(name in params) || !Number.isFinite(Number(value))) return false;
      params[name] = Number(value);
      return true;
    },
    resetVisualRopes,
    destroy() {
      state.initialized = false;
      const index = hooks.indexOf(frame);
      if (index >= 0) hooks.splice(index, 1);
      if (hardwareRoot.parent) hardwareRoot.parent.remove(hardwareRoot);
      for (const rope of Object.values(ropes)) {
        if (rope.customMesh && rope.mesh.parent) rope.mesh.parent.remove(rope.mesh);
      }
      if (ui && ui.root && ui.root.parentNode) ui.root.parentNode.removeChild(ui.root);
      if (window.__labMetrics === ropeLabMetricsWrapper) {
        window.__labMetrics = previousLabMetrics;
      }
      if (sim?.reset === wrappedSimReset) sim.reset = previousSimReset;
      if (core.ropeHardware === api) delete core.ropeHardware;
      if (master.ropeHardwareV16 === api) delete master.ropeHardwareV16;
      if (window[MODULE_ID] === api) delete window[MODULE_ID];
    },
  };

  // Additive module links only; no core force hooks or constraints are replaced.
  core.ropeHardware = api;
  master.ropeHardwareV16 = api;
  window[MODULE_ID] = api;
  state.initialized = true;
})();
