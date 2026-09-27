(() => {
  "use strict";

  const VERSION = "LASER2_STANDING_RIG_COLLISION_V17_3_20260715";
  const master = window.LASER2_CREW_RIGGING_MASTER_V2;
  const rigV16 = window.LASER2_RIGGING_V16;
  const ropeV16 = window.LASER2_ROPE_HARDWARE_V16 || master?.ropeHardwareV16;
  const spreader = window.LASER2_SPREADER_RIG_V17_2;
  if (!master?.physics || !master?.rig || !master?.body || !rigV16?.layout || !spreader?.routedShrouds) {
    console.error(`${VERSION}: spreader, rigging, or physics authority is unavailable`);
    return;
  }

  const world = master.physics;
  const rig = master.rig;
  const body = master.body;
  const Vec3 = body.pos.constructor;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const finite = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;

  const params = {
    enabled: true,
    sailCollisionEnabled: true,
    ropeCollisionEnabled: true,
    shroudRadiusM: 0.0022,
    sailCollisionMarginM: 0.0030,
    ropeCollisionMarginM: 0.0015,
    maxSailCorrectionM: 0.020,
    maxRopeCorrectionM: 0.018,
    ropePreviousFollow: 1.0,
    reactionCoupling: true,
    cableCastShadow: true,
  };

  const state = {
    initialized: false,
    finite: true,
    lastError: null,
    collisionObjects: 0,
    sailContactsFrame: 0,
    ropeContactsFrame: 0,
    sailContactEventsTotal: 0,
    ropeContactEventsTotal: 0,
    reactionCoupledContactsFrame: 0,
    maxSailPenetrationM: 0,
    maxRopePenetrationM: 0,
    wrappedRopeRoutes: 0,
    activeSailParticles: 0,
    steps: 0,
    sourceModified: true,
  };

  const tmp = Array.from({ length: 18 }, () => new Vec3());
  const fallbackNormal = new Vec3(1, 0, 0);

  function endpointPosition(endpoint, out) {
    if (endpoint.type === "particle") return out.copy(endpoint.p.x);
    if (endpoint.type === "body") return endpoint.body.localToWorld(endpoint.local, out);
    return out.copy(endpoint.a.x).lerp(endpoint.b.x, endpoint.t);
  }

  function endpointInvMass(endpoint, gradient, worldPosition, lever) {
    const magnitudeSquared = gradient.lengthSq();
    if (magnitudeSquared < 1e-16) return 0;
    if (endpoint.type === "particle") return endpoint.p.w * magnitudeSquared;
    if (endpoint.type === "body") {
      if (endpoint.body.kinematic) return 0;
      const magnitude = Math.sqrt(magnitudeSquared);
      lever.copy(worldPosition).sub(endpoint.body.pos);
      tmp[17].copy(gradient).multiplyScalar(1 / magnitude);
      return endpoint.body.genInvMass(lever, tmp[17]) * magnitudeSquared;
    }
    const wa = 1 - endpoint.t;
    const wb = endpoint.t;
    return (wa * wa * endpoint.a.w + wb * wb * endpoint.b.w) * magnitudeSquared;
  }

  function applyEndpointCorrection(endpoint, gradient, scalar, worldPosition, lever) {
    if (endpoint.type === "particle") {
      endpoint.p.x.addScaledVector(gradient, scalar * endpoint.p.w);
      return;
    }
    if (endpoint.type === "body") {
      if (!endpoint.body.kinematic) {
        lever.copy(worldPosition).sub(endpoint.body.pos);
        tmp[16].copy(gradient).multiplyScalar(scalar);
        endpoint.body.applyCorrection(tmp[16], lever);
      }
      return;
    }
    const wa = 1 - endpoint.t;
    const wb = endpoint.t;
    endpoint.a.x.addScaledVector(gradient, scalar * wa * endpoint.a.w);
    endpoint.b.x.addScaledVector(gradient, scalar * wb * endpoint.b.w);
  }

  function visualShroudMeshes() {
    const children = rig.group?.children || [];
    return {
      upperPort: children[4] || null,
      upperStarboard: children[5] || null,
      lowerPort: children[6] || null,
      lowerStarboard: children[7] || null,
    };
  }

  const visual = visualShroudMeshes();
  const collisionObjects = [];

  function addCollisionObject(cable, side, segment, endpointA, endpointB, mesh) {
    const object = {
      id: `rig.shroud.collision.${segment}.${side}`,
      side,
      segment,
      cable,
      endpointA,
      endpointB,
      mesh,
      radiusM: params.shroudRadiusM,
      a: new Vec3(),
      b: new Vec3(),
      axis: new Vec3(),
      min: new Vec3(),
      max: new Vec3(),
      lengthM: 0,
      isDynamicCapsuleCollider: true,
      collisionGroups: Object.freeze(["sail", "rope"]),
    };
    if (mesh) {
      mesh.castShadow = !!params.cableCastShadow;
      mesh.userData = mesh.userData || {};
      mesh.userData.laser2CollisionCapsuleV17_3 = {
        id: object.id,
        radiusM: params.shroudRadiusM,
        collisionGroups: ["sail", "rope"],
        dynamic: true,
      };
    }
    collisionObjects.push(object);
    return object;
  }

  for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
    const cable = spreader.routedShrouds[sideIndex];
    const side = sideIndex === 0 ? "port" : "starboard";
    addCollisionObject(
      cable,
      side,
      "lower",
      cable.endpointA,
      cable.sheaveEndpoint,
      sideIndex === 0 ? visual.lowerPort : visual.lowerStarboard,
    );
    addCollisionObject(
      cable,
      side,
      "upper",
      cable.sheaveEndpoint,
      cable.endpointB,
      sideIndex === 0 ? visual.upperPort : visual.upperStarboard,
    );
  }
  state.collisionObjects = collisionObjects.length;

  function updateCollisionObjects() {
    for (const cable of spreader.routedShrouds) cable.measure();
    for (const object of collisionObjects) {
      endpointPosition(object.endpointA, object.a);
      endpointPosition(object.endpointB, object.b);
      object.axis.copy(object.b).sub(object.a);
      object.lengthM = object.axis.length();
      object.radiusM = Math.max(0.0005, finite(params.shroudRadiusM, 0.0022));
      const r = object.radiusM + Math.max(params.sailCollisionMarginM, params.ropeCollisionMarginM);
      object.min.set(
        Math.min(object.a.x, object.b.x) - r,
        Math.min(object.a.y, object.b.y) - r,
        Math.min(object.a.z, object.b.z) - r,
      );
      object.max.set(
        Math.max(object.a.x, object.b.x) + r,
        Math.max(object.a.y, object.b.y) + r,
        Math.max(object.a.z, object.b.z) + r,
      );
      if (object.mesh) {
        object.mesh.castShadow = !!params.cableCastShadow;
        if (object.mesh.userData?.laser2CollisionCapsuleV17_3) {
          object.mesh.userData.laser2CollisionCapsuleV17_3.radiusM = object.radiusM;
        }
      }
    }
  }

  function broadphase(point, object, margin) {
    return point.x >= object.min.x - margin && point.x <= object.max.x + margin &&
      point.y >= object.min.y - margin && point.y <= object.max.y + margin &&
      point.z >= object.min.z - margin && point.z <= object.max.z + margin;
  }

  function closestOnCapsule(point, object, closest, normal) {
    tmp[0].copy(object.b).sub(object.a);
    const lengthSq = tmp[0].lengthSq();
    let t = 0;
    if (lengthSq > 1e-14) {
      t = clamp(tmp[1].copy(point).sub(object.a).dot(tmp[0]) / lengthSq, 0, 1);
    }
    closest.copy(object.a).addScaledVector(tmp[0], t);
    normal.copy(point).sub(closest);
    let distance = normal.length();
    if (distance < 1e-9) {
      fallbackNormal.set(1, 0, 0).applyQuaternion(body.quat);
      normal.copy(fallbackNormal).cross(tmp[0]);
      if (normal.lengthSq() < 1e-10) normal.set(0, 0, 1);
      normal.normalize();
      distance = 0;
    } else normal.multiplyScalar(1 / distance);
    return { t, distance };
  }

  class SailStandingRigContactConstraint {
    constructor() {
      this.enabled = true;
      this.lambda = 0;
      this._closest = new Vec3();
      this._normal = new Vec3();
      this._gA = new Vec3();
      this._gB = new Vec3();
      this._leverA = new Vec3();
      this._leverB = new Vec3();
      this._worldA = new Vec3();
      this._worldB = new Vec3();
    }

    _resolveParticle(particle, object) {
      const clothThickness = Math.max(0, finite(rigV16.params?.clothThicknessM, 0.0012));
      const margin = Math.max(0, finite(params.sailCollisionMarginM, 0.003));
      const target = object.radiusM + clothThickness + margin;
      if (!broadphase(particle.x, object, target)) return;
      const result = closestOnCapsule(particle.x, object, this._closest, this._normal);
      if (result.distance >= target) return;
      const penetration = Math.min(
        Math.max(0.0001, finite(params.maxSailCorrectionM, 0.02)),
        target - result.distance,
      );
      const ta = 1 - result.t;
      const tb = result.t;
      this._gA.copy(this._normal).multiplyScalar(-ta);
      this._gB.copy(this._normal).multiplyScalar(-tb);
      endpointPosition(object.endpointA, this._worldA);
      endpointPosition(object.endpointB, this._worldB);
      const weightParticle = Math.max(0, finite(particle.w, 0));
      let denominator = weightParticle;
      if (params.reactionCoupling) {
        denominator += endpointInvMass(object.endpointA, this._gA, this._worldA, this._leverA);
        denominator += endpointInvMass(object.endpointB, this._gB, this._worldB, this._leverB);
      }
      if (denominator <= 1e-12) return;
      const scalar = penetration / denominator;
      particle.x.addScaledVector(this._normal, scalar * weightParticle);
      if (params.reactionCoupling) {
        applyEndpointCorrection(object.endpointA, this._gA, scalar, this._worldA, this._leverA);
        applyEndpointCorrection(object.endpointB, this._gB, scalar, this._worldB, this._leverB);
        state.reactionCoupledContactsFrame++;
      }
      state.sailContactsFrame++;
      state.sailContactEventsTotal++;
      state.maxSailPenetrationM = Math.max(state.maxSailPenetrationM, target - result.distance);
    }

    solve() {
      if (!this.enabled || !params.enabled || !params.sailCollisionEnabled) return;
      updateCollisionObjects();
      const layouts = [rigV16.layout.main, rigV16.layout.jib];
      if (rigV16.helpers?.isSpinnakerPhysical?.()) layouts.push(rigV16.layout.spin);
      let particleCount = 0;
      for (const layout of layouts) {
        for (const row of layout || []) {
          for (const particle of row || []) {
            particleCount++;
            for (const object of collisionObjects) this._resolveParticle(particle, object);
          }
        }
      }
      state.activeSailParticles = particleCount;
    }
  }

  const sailContact = new SailStandingRigContactConstraint();
  world.addC(sailContact);

  function resolveRopeNode(route, node, object) {
    const margin = Math.max(0, finite(params.ropeCollisionMarginM, 0.0015));
    const target = object.radiusM + Math.max(0, finite(route.radius, 0.004)) + margin;
    if (!broadphase(node.position, object, target)) return false;
    const closest = tmp[2];
    const normal = tmp[3];
    const result = closestOnCapsule(node.position, object, closest, normal);
    if (result.distance >= target) return false;
    const penetration = Math.min(
      Math.max(0.0001, finite(params.maxRopeCorrectionM, 0.018)),
      target - result.distance,
    );
    node.position.addScaledVector(normal, penetration);
    node.previous.addScaledVector(normal, penetration * clamp(params.ropePreviousFollow, 0, 1));
    state.ropeContactsFrame++;
    state.ropeContactEventsTotal++;
    state.maxRopePenetrationM = Math.max(state.maxRopePenetrationM, target - result.distance);
    return true;
  }

  function wrapRopeRoutes() {
    if (!ropeV16?.ropes) return;
    for (const route of Object.values(ropeV16.ropes)) {
      if (!route || route.__laser2WireCollisionV173) continue;
      const original = route.resolveCollisions;
      if (typeof original !== "function") continue;
      route.__laser2WireCollisionV173 = { original };
      route.resolveCollisions = function (...args) {
        const result = original.apply(this, args);
        if (!params.enabled || !params.ropeCollisionEnabled) return result;
        updateCollisionObjects();
        for (let i = 1; i < this.nodeCount - 1; i++) {
          if (this.pins?.[i]) continue;
          let contacted = false;
          for (const object of collisionObjects) {
            contacted = resolveRopeNode(this, this.nodes[i], object) || contacted;
          }
          if (contacted) {
            if (this.nodeContacts) this.nodeContacts[i] = 1;
            this.collisionCount = finite(this.collisionCount, 0) + 1;
          }
        }
        this.pinGuides?.();
        return result;
      };
      state.wrappedRopeRoutes++;
    }
  }
  wrapRopeRoutes();

  function resetStep() {
    state.sailContactsFrame = 0;
    state.ropeContactsFrame = 0;
    state.reactionCoupledContactsFrame = 0;
    state.maxSailPenetrationM = 0;
    state.maxRopePenetrationM = 0;
    state.steps++;
    updateCollisionObjects();
  }
  world.forceHooks.push(resetStep);

  function metrics() {
    updateCollisionObjects();
    const capsules = collisionObjects.map((object) => ({
      id: object.id,
      side: object.side,
      segment: object.segment,
      radiusM: object.radiusM,
      lengthM: object.lengthM,
      a: object.a.toArray(),
      b: object.b.toArray(),
      meshName: object.mesh?.name || null,
      meshVisible: object.mesh?.visible !== false,
      meshCastShadow: object.mesh?.castShadow === true,
      sailCollision: !!params.sailCollisionEnabled,
      ropeCollision: !!params.ropeCollisionEnabled,
    }));
    const numericFinite = capsules.every((c) =>
      Number.isFinite(c.radiusM) && Number.isFinite(c.lengthM) &&
      c.a.every(Number.isFinite) && c.b.every(Number.isFinite),
    );
    state.finite = state.finite && numericFinite;
    if (!numericFinite && !state.lastError) state.lastError = "non-finite standing-rig collision capsule";
    return {
      version: VERSION,
      enabled: params.enabled,
      finite: state.finite,
      lastError: state.lastError,
      collisionObjects: collisionObjects.length,
      dynamicCapsuleSegments: capsules,
      sailContactsFrame: state.sailContactsFrame,
      ropeContactsFrame: state.ropeContactsFrame,
      sailContactEventsTotal: state.sailContactEventsTotal,
      ropeContactEventsTotal: state.ropeContactEventsTotal,
      reactionCoupledContactsFrame: state.reactionCoupledContactsFrame,
      maxSailPenetrationM: state.maxSailPenetrationM,
      maxRopePenetrationM: state.maxRopePenetrationM,
      wrappedRopeRoutes: state.wrappedRopeRoutes,
      activeSailParticles: state.activeSailParticles,
      model: {
        cable: "four live capsule objects bound to the visible lower/upper port/starboard shroud meshes",
        sail: "reaction-coupled point-to-dynamic-capsule PBD contact; corrections transfer to chainplate/spreader/mast endpoints",
        rope: "visual rope-node to dynamic-capsule collision inside each route's XPBD closure loop",
        truthBoundary: "running-rope collision is one-way because the V16 rope layer is explicitly visual, while sail contact reacts into the structural standing rig",
      },
      parameters: { ...params },
      sourceModified: true,
    };
  }

  function setParam(name, value) {
    if (!(name in params)) return false;
    if (typeof params[name] === "boolean") params[name] = !!value;
    else if (!Number.isFinite(+value)) return false;
    else params[name] = +value;
    updateCollisionObjects();
    return true;
  }

  function restore() {
    sailContact.enabled = false;
    params.enabled = false;
    for (const route of Object.values(ropeV16?.ropes || {})) {
      const patch = route.__laser2WireCollisionV173;
      if (patch?.original) route.resolveCollisions = patch.original;
      delete route.__laser2WireCollisionV173;
    }
    for (const object of collisionObjects) {
      if (object.mesh?.userData) delete object.mesh.userData.laser2CollisionCapsuleV17_3;
    }
  }

  const receipt = Object.freeze({
    cableObjects: "the routed shroud is represented by four separate live capsule collision objects, one per visible upper/lower cable segment",
    sailContact: "main, jib and physical spinnaker particles collide with shroud capsules and transfer the reaction into live chainplate/spreader/mast endpoints",
    ropeContact: "every V16 running-rope route resolves node contact against the same live capsules before tube geometry is written",
    shadowLink: "the visible cable meshes are the visual partners of the collision capsules and may cast ordinary shadow-map shadows",
    calibration: "wire diameter and collision margins are exposed parameters pending measured cable and fitting dimensions",
  });

  const api = {
    VERSION,
    params,
    state,
    collisionObjects,
    sailContact,
    metrics,
    setParam,
    updateCollisionObjects,
    restore,
    receipt,
  };
  window.LASER2_STANDING_RIG_COLLISION_V17_3 = api;

  const previousMetrics = window.__labMetrics;
  window.__labMetrics = function () {
    const base = typeof previousMetrics === "function" ? previousMetrics() : {};
    return { ...base, standingRigCollisionV17_3: metrics() };
  };

  const hooks = (window.LASER2_FRAME_HOOKS = window.LASER2_FRAME_HOOKS || []);
  function frame() {
    updateCollisionObjects();
    if (ropeV16?.metricsState) {
      ropeV16.metricsState.wireCollisionCount = state.ropeContactsFrame;
      ropeV16.metricsState.wireCollisionObjects = collisionObjects.length;
    }
  }
  hooks.push(frame);

  state.initialized = true;
  updateCollisionObjects();
  console.info(`${VERSION} initialized`, metrics(), receipt);
})();
