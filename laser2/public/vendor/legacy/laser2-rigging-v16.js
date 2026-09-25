(() => {
  "use strict";

  const VERSION = "LASER2_RIGGING_SAIL_AUTHORITY_V16_20260715";
  const master = window.LASER2_CREW_RIGGING_MASTER_V2;
  if (!master?.physics || !master?.rig || !master?.sails || !master?.body) {
    console.error(`${VERSION}: required patched V15 runtime exports are missing`);
    return;
  }

  const world = master.physics;
  const body = master.body;
  const rig = master.rig;
  const sails = master.sails;
  const cfg = master.config;
  const Vec3 = body.pos.constructor;
  const Quat = body.quat.constructor;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => {
    const t = clamp((x - a) / Math.max(1e-9, b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const params = {
    enabled: true,
    solverIterations: 6,
    mastEiScale: 1,
    mastEiLowerSideNm2: 7800,
    mastEiUpperSideNm2: 3600,
    mastForeAftFactor: 1.35,
    mastStructuralDamping: 0.115,
    mastLowerDiameterM: 0.064,
    mastUpperDiameterM: 0.044,
    mastTrackClearanceM: 0.004,
    standingRigPretensionN: 450,
    standingRigTensionScale: 1,
    jibHalyardTakeupM: 0.026,
    jibHalyardComplianceMPerN: 4.0e-6,
    forestaySafetySlackRatio: 0.02,
    trapezeLoadScale: 1,
    clothThicknessM: 0.007,
    clothCollisionMarginM: 0.006,
    sailSailCollision: true,
    sailSailContactPasses: 2,
    sailSparCollision: true,
    jibClewDeckCollision: true,
    collisionMaxCorrectionM: 0.028,
    airTurbulence01: 0.18,
    turbulenceLengthM: 1.4,
    sailAeroScale: 0.82,
    sailLiftSlope: 5.25,
    sailStallDeg: 18,
    sailPostStallCn: 1.18,
    sailProfileCd: 0.026,
    sailInducedEfficiency: 0.78,
    mastAirCd: 1.08,
    boomAirCd: 1.02,
    wetRig01: 0,
    autoWetRig: true,
    boomRetainedWaterKg: 0.82,
    mastRetainedWaterKg: 0.58,
    wetDrainHalfLifeS: 38,
    sparWaterCd: 1.15,
    sparWaterAddedMassCoeff: 0.85,
    ropeCollision: true,
    ropeFollowStrength: 34,
    ropeDamping: 0.985,
    ropeGravityScale: 1,
    clothOpacity: 0.86,
    clothTransmission: 0.34,
    vinylOpacity: 0.30,
    vinylHaze: 0.22,
    hardwareVisible: true,
    diagnosticsVisible: true,
  };

  const state = {
    initialized: false,
    finite: true,
    lastError: null,
    steps: 0,
    frame: 0,
    legacyConstraintsDisabled: 0,
    rodConstraints: 0,
    trackConstraints: 0,
    jibHeadAttachmentReplaced: false,
    jibHalyardLoadPathInstalled: false,
    forestayAttachmentReplaced: false,
    legacySpreaderDiagonalsDisabled: 0,
    clothConstraintsRetuned: 0,
    battenConstraintsRetuned: 0,
    reinforcementMassKg: 0,
    contactCount: 0,
    mastContacts: 0,
    boomContacts: 0,
    sailSailContacts: 0,
    jibClewDeckContacts: 0,
    contactEventsTotal: 0,
    mastContactEventsTotal: 0,
    boomContactEventsTotal: 0,
    sailSailContactEventsTotal: 0,
    jibClewDeckContactEventsTotal: 0,
    hardwareDeckContacts: 0,
    hardwareDeckContactEventsTotal: 0,
    maxPenetrationM: 0,
    sailForceN: 0,
    mainForceN: 0,
    jibForceN: 0,
    spinForceN: 0,
    mastAirForceN: 0,
    boomAirForceN: 0,
    wetness01: 0,
    wetMassKg: 0,
    maxCurvatureInvM: 0,
    maxBendM: 0,
    mastTipOffsetM: 0,
    mastStrainEnergyJ: 0,
    trapezeTensionN: 0,
    collisionStepMs: 0,
    aeroStepMs: 0,
    sourceModified: true,
  };

  const tmp = Array.from({ length: 32 }, () => new Vec3());
  const qInv = new Quat();
  const unitX = new Vec3(1, 0, 0);
  const unitY = new Vec3(0, 1, 0);
  const unitZ = new Vec3(0, 0, 1);
  const particleIndex = new Map(world.particles.map((p, i) => [p, i]));

  function grid(particles, rows, cols, start) {
    const out = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(particles[start + r * cols + c]);
      out.push(row);
    }
    return out;
  }

  function deriveLayout() {
    if (
      sails.main?.cloth?.parts?.length === cfg.main.rows &&
      sails.jib?.cloth?.parts?.length === cfg.jib.rows &&
      sails.spin?.cloth?.parts?.length === cfg.spin.rows
    ) {
      const main = sails.main.cloth.parts;
      const jib = sails.jib.cloth.parts;
      const spin = sails.spin.cloth.parts;
      return {
        main,
        jib,
        spin,
        mainFlat: sails.main.cloth.flat || main.flat(),
        jibFlat: sails.jib.cloth.flat || jib.flat(),
        spinFlat: sails.spin.cloth.flat || spin.flat(),
        pole: [sails.spin.poleInner, sails.spin.poleOuter].filter(Boolean),
      };
    }
    const structural = [
      ...rig.mast,
      ...rig.spreaderTips,
      ...rig.boom,
      rig.bridleApex,
    ];
    const rigEnd = Math.max(...structural.map((p) => particleIndex.get(p))) + 1;
    const mainCount = cfg.main.rows * cfg.main.cols;
    const jibCount = cfg.jib.rows * cfg.jib.cols;
    const spinCount = cfg.spin.rows * cfg.spin.cols;
    const expected = rigEnd + mainCount + jibCount + spinCount + 2;
    if (world.particles.length < expected) {
      throw new Error(
        `particle layout mismatch (rigEnd=${rigEnd}, particles=${world.particles.length}, expected>=${expected})`,
      );
    }
    const mainStart = rigEnd;
    const jibStart = mainStart + mainCount;
    const spinStart = jibStart + jibCount;
    return {
      main: grid(world.particles, cfg.main.rows, cfg.main.cols, mainStart),
      jib: grid(world.particles, cfg.jib.rows, cfg.jib.cols, jibStart),
      spin: grid(world.particles, cfg.spin.rows, cfg.spin.cols, spinStart),
      mainFlat: world.particles.slice(mainStart, mainStart + mainCount),
      jibFlat: world.particles.slice(jibStart, jibStart + jibCount),
      spinFlat: world.particles.slice(spinStart, spinStart + spinCount),
      pole: world.particles.slice(spinStart + spinCount, spinStart + spinCount + 2),
    };
  }

  let layout;
  try {
    layout = deriveLayout();
  } catch (error) {
    state.finite = false;
    state.lastError = error.message;
    console.error(VERSION, error);
    return;
  }

  const generatedJibLuffM = Number(sails.jib?.generatedLuffM);
  const generatedJibLuffRestM = sails.jib?.generatedLuffRestM;
  const generatedJibLuffErrorM = Math.abs(generatedJibLuffM - cfg.jib.luff);
  const generatedJibLuffSegmentsValid =
    Array.isArray(generatedJibLuffRestM) &&
    generatedJibLuffRestM.length === cfg.jib.rows - 1 &&
    generatedJibLuffRestM.every(
      (rest) => Number.isFinite(rest) && rest > 0,
    );
  if (
    !Number.isFinite(generatedJibLuffM) ||
    generatedJibLuffErrorM > 5e-6 ||
    !generatedJibLuffSegmentsValid
  ) {
    state.finite = false;
    state.lastError = Number.isFinite(generatedJibLuffM) && generatedJibLuffSegmentsValid
      ? `generated jib luff is ${generatedJibLuffM.toFixed(6)} m; configured ${cfg.jib.luff.toFixed(6)} m`
      : "generated jib-luff verification receipt is unavailable";
    console.error(`${VERSION}: ${state.lastError}`);
    return;
  }

  const originalJibSetHalyard = sails.jib.setHalyard;
  function enforceMeasuredJibLuffRest() {
    const constraints = sails.jib.cloth.vertCons[0];
    for (let i = 0; i < constraints.length; i++) {
      constraints[i].rest = generatedJibLuffRestM[i];
    }
  }
  // V15 changed sailcloth material length when its halyard control moved.
  // V16 keeps the verified luff-wire rest fixed; total-length pulley take-up
  // supplies halyard tension without inventing or removing edge material.
  sails.jib.setHalyard = function () {
    enforceMeasuredJibLuffRest();
  };
  enforceMeasuredJibLuffRest();

  function bodyAxis(local, out) {
    return out.copy(local).applyQuaternion(body.quat).normalize();
  }

  function designToWorld(local, out) {
    const ref = master.bodyReference || tmp[31].set(0, cfg.hull.bodyReferenceY, cfg.hull.comZ);
    return body.localToWorld(out.copy(local).sub(ref), out);
  }

  function worldToDesign(point, out) {
    const ref = master.bodyReference || tmp[31].set(0, cfg.hull.bodyReferenceY, cfg.hull.comZ);
    qInv.copy(body.quat).invert();
    return out.copy(point).sub(body.pos).applyQuaternion(qInv).add(ref);
  }

  function mastRadiusAt(f) {
    return 0.5 * lerp(params.mastLowerDiameterM, params.mastUpperDiameterM, clamp(f, 0, 1));
  }

  function hullHalfWidth(u) {
    let value;
    if (u < 0.45) {
      const x = clamp(u / 0.45, 0, 1);
      const s = x * x * (3 - 2 * x);
      value = lerp(0.775, 1, Math.pow(s, 0.9));
    } else {
      const x = clamp((u - 0.45) / 0.55, 0, 1);
      value = Math.pow(Math.cos((x * Math.PI) / 2), 1.18);
    }
    return Math.max(0.016, 0.71 * value);
  }

  function rigDeckY(x, z) {
    const u = clamp((z + 2.2) / 4.4, 0, 1);
    const half = hullHalfWidth(u);
    const sheer = 0.365 + 0.045 * u + 0.14 * u * u * u;
    const crown =
      0.045 * (1 - Math.pow(Math.min(Math.abs(x) / Math.max(half, 0.01), 1), 2));
    const cockpitHalf = half - 0.175;
    const lateralX = clamp((Math.abs(x) - (cockpitHalf - 0.07)) / 0.09, 0, 1);
    const lateral = 1 - lateralX * lateralX * (3 - 2 * lateralX);
    const aftX = clamp((z + 1.78) / 0.1, 0, 1);
    const aft = aftX * aftX * (3 - 2 * aftX);
    const forwardX = clamp((z - 0.3) / 0.1, 0, 1);
    const forward = 1 - forwardX * forwardX * (3 - 2 * forwardX);
    const cockpit = lateral * aft * forward;
    return lerp(sheer + crown, 0.155, cockpit);
  }

  function mastEiAt(f, foreAft = false) {
    const z = clamp(f, 0, 1) * cfg.mast.height;
    const jointZ = 4.21;
    let ei;
    if (z < jointZ) {
      ei = params.mastEiLowerSideNm2 * lerp(1, 0.86, z / jointZ);
    } else {
      const upperF = (z - jointZ) / Math.max(0.1, cfg.mast.height - jointZ);
      ei = params.mastEiUpperSideNm2 * lerp(1, 0.82, upperF);
      // The finite overlap/sleeve is represented as an explicit local
      // compliance band, rather than smearing upper-section softness down
      // the whole lower extrusion.
      if (z < jointZ + 0.26) ei *= 0.82;
    }
    if (foreAft) ei *= params.mastForeAftFactor;
    return Math.max(120, ei * params.mastEiScale);
  }

  class DirectionalRodBendConstraint {
    constructor(a, b, c, index, count, segmentLength) {
      this.a = a;
      this.b = b;
      this.c = c;
      this.index = index;
      this.count = count;
      this.segmentLength = segmentLength;
      this.lambda = 0;
      this.lambdaSide = 0;
      this.lambdaFore = 0;
      this.enabled = true;
      this._d = new Vec3();
      this._tangent = new Vec3();
      this._side = new Vec3();
      this._fore = new Vec3();
    }

    _solveAxis(axis, ei, dt, lambdaKey) {
      this._d.copy(this.a.x).add(this.c.x).addScaledVector(this.b.x, -2);
      const C = this._d.dot(axis);
      const w = this.a.w + 4 * this.b.w + this.c.w;
      if (w <= 0 || !Number.isFinite(C)) return;
      const compliance = Math.pow(this.segmentLength, 3) / Math.max(1, ei);
      const alpha = compliance / (dt * dt);
      const oldLambda = this[lambdaKey];
      const deltaLambda = (-C - alpha * oldLambda) / (w + alpha);
      this[lambdaKey] = oldLambda + deltaLambda;
      this.a.x.addScaledVector(axis, deltaLambda * this.a.w);
      this.b.x.addScaledVector(axis, -2 * deltaLambda * this.b.w);
      this.c.x.addScaledVector(axis, deltaLambda * this.c.w);
    }

    solve(dt) {
      if (!this.enabled || !params.enabled) return;
      if (this.lambda === 0) {
        this.lambdaSide = 0;
        this.lambdaFore = 0;
        this.lambda = 1;
      }
      this._tangent.copy(this.c.x).sub(this.a.x);
      if (this._tangent.lengthSq() < 1e-10) return;
      this._tangent.normalize();
      bodyAxis(unitX, this._side);
      this._side.addScaledVector(this._tangent, -this._side.dot(this._tangent));
      if (this._side.lengthSq() < 1e-7) bodyAxis(unitZ, this._side);
      this._side.normalize();
      this._fore.crossVectors(this._tangent, this._side).normalize();
      const f = this.index / Math.max(1, this.count - 1);
      this._solveAxis(this._side, mastEiAt(f, false), dt, "lambdaSide");
      this._solveAxis(this._fore, mastEiAt(f, true), dt, "lambdaFore");
    }
  }

  class MastTrackConstraint {
    constructor(a, b, p, t, rowIndex, rowCount) {
      this.a = a;
      this.b = b;
      this.p = p;
      this.t = t;
      this.rowIndex = rowIndex;
      this.rowCount = rowCount;
      this.lambda = 0;
      this.lambdas = [0, 0, 0];
      this.enabled = true;
      this._target = new Vec3();
      this._tangent = new Vec3();
      this._aft = new Vec3();
      this._error = new Vec3();
    }

    solve(dt) {
      if (!this.enabled || !params.enabled) return;
      if (this.lambda === 0) {
        this.lambdas[0] = this.lambdas[1] = this.lambdas[2] = 0;
        this.lambda = 1;
      }
      const wa = 1 - this.t;
      const wb = this.t;
      this._target.copy(this.a.x).multiplyScalar(wa).addScaledVector(this.b.x, wb);
      this._tangent.copy(this.b.x).sub(this.a.x).normalize();
      bodyAxis(tmp[0].set(0, 0, -1), this._aft);
      this._aft.addScaledVector(this._tangent, -this._aft.dot(this._tangent));
      if (this._aft.lengthSq() < 1e-8) bodyAxis(unitX, this._aft);
      this._aft.normalize();
      const f = this.rowIndex / Math.max(1, this.rowCount - 1);
      this._target.addScaledVector(
        this._aft,
        mastRadiusAt(f) + params.mastTrackClearanceM + 0.5 * params.clothThicknessM,
      );
      this._error.copy(this.p.x).sub(this._target);
      const denom = this.p.w + wa * wa * this.a.w + wb * wb * this.b.w;
      if (denom <= 0) return;
      const alpha = 2e-10 / (dt * dt);
      for (let axis = 0; axis < 3; axis++) {
        const key = axis === 0 ? "x" : axis === 1 ? "y" : "z";
        const old = this.lambdas[axis];
        const dl = (-this._error[key] - alpha * old) / (denom + alpha);
        this.lambdas[axis] = old + dl;
        this.p.x[key] += dl * this.p.w;
        this.a.x[key] -= dl * wa * this.a.w;
        this.b.x[key] -= dl * wb * this.b.w;
      }
    }
  }

  function mastEndpoint(zM) {
    const s = clamp(zM / rig.segLen, 0, rig.mast.length - 1.000001);
    const i = Math.min(rig.mast.length - 2, Math.floor(s));
    return { type: "mast", a: rig.mast[i], b: rig.mast[i + 1], t: s - i, zM };
  }

  function particleEndpoint(particle, label = "particle") {
    return { type: "particle", p: particle, label };
  }

  function bodyEndpoint(designLocal, label = "body") {
    const local = master.designToBody
      ? master.designToBody(designLocal)
      : designLocal.clone().sub(master.bodyReference || new Vec3(0, cfg.hull.bodyReferenceY, cfg.hull.comZ));
    return { type: "body", body, local, label };
  }

  class EndpointCableConstraint {
    constructor(endpointA, endpointB, rest, compliance, label) {
      this.endpointA = endpointA;
      this.endpointB = endpointB;
      this.rest = rest;
      this.alpha = compliance;
      this.label = label;
      this.lambda = 0;
      this.tension = 0;
      this.enabled = true;
      this._a = new Vec3();
      this._b = new Vec3();
      this._direction = new Vec3();
      this._leverA = new Vec3();
      this._leverB = new Vec3();
      this._correction = new Vec3();
    }

    _position(endpoint, out) {
      if (endpoint.type === "particle") return out.copy(endpoint.p.x);
      if (endpoint.type === "body") return endpoint.body.localToWorld(endpoint.local, out);
      return out.copy(endpoint.a.x).lerp(endpoint.b.x, endpoint.t);
    }

    _invMass(endpoint, direction, worldPosition, lever) {
      if (endpoint.type === "particle") return endpoint.p.w;
      if (endpoint.type === "body") {
        lever.copy(worldPosition).sub(endpoint.body.pos);
        return endpoint.body.kinematic ? 0 : endpoint.body.genInvMass(lever, direction);
      }
      const wa = 1 - endpoint.t;
      const wb = endpoint.t;
      return wa * wa * endpoint.a.w + wb * wb * endpoint.b.w;
    }

    _apply(endpoint, correction, lever) {
      if (endpoint.type === "particle") {
        endpoint.p.x.addScaledVector(correction, endpoint.p.w);
        return;
      }
      if (endpoint.type === "body") {
        if (!endpoint.body.kinematic) endpoint.body.applyCorrection(correction, lever);
        return;
      }
      const wa = 1 - endpoint.t;
      const wb = endpoint.t;
      endpoint.a.x.addScaledVector(correction, wa * endpoint.a.w);
      endpoint.b.x.addScaledVector(correction, wb * endpoint.b.w);
    }

    measure() {
      return this._position(this.endpointA, this._a).distanceTo(
        this._position(this.endpointB, this._b),
      );
    }

    solve(dt) {
      if (!this.enabled || !params.enabled) return;
      this._position(this.endpointA, this._a);
      this._position(this.endpointB, this._b);
      this._direction.copy(this._b).sub(this._a);
      const distance = this._direction.length();
      if (distance < 1e-9) return;
      this._direction.multiplyScalar(1 / distance);
      const C = distance - this.rest;
      const wA = this._invMass(this.endpointA, this._direction, this._a, this._leverA);
      const wB = this._invMass(this.endpointB, this._direction, this._b, this._leverB);
      const alpha = this.alpha / (dt * dt);
      const delta = (-C - alpha * this.lambda) / Math.max(1e-9, wA + wB + alpha);
      const next = Math.min(0, this.lambda + delta);
      const dl = next - this.lambda;
      this.lambda = next;
      this.tension = Math.max(0, -next / (dt * dt));
      this._correction.copy(this._direction).multiplyScalar(-dl);
      this._apply(this.endpointA, this._correction, this._leverA);
      this._correction.copy(this._direction).multiplyScalar(dl);
      this._apply(this.endpointB, this._correction, this._leverB);
    }
  }

  class EndpointPulleyCableConstraint extends EndpointCableConstraint {
    constructor(endpointA, sheaveEndpoint, endpointB, rest, compliance, label) {
      super(endpointA, endpointB, rest, compliance, label);
      this.sheaveEndpoint = sheaveEndpoint;
      this._sheave = new Vec3();
      this._gradientA = new Vec3();
      this._gradientB = new Vec3();
      this._gradientSheave = new Vec3();
      this._leverSheave = new Vec3();
    }

    _gradientWeight(endpoint, gradient, worldPosition, lever) {
      const magnitudeSquared = gradient.lengthSq();
      if (endpoint.type === "particle") return endpoint.p.w * magnitudeSquared;
      if (endpoint.type === "body") {
        const magnitude = Math.sqrt(magnitudeSquared);
        if (magnitude < 1e-12 || endpoint.body.kinematic) return 0;
        lever.copy(worldPosition).sub(endpoint.body.pos);
        tmp[31].copy(gradient).multiplyScalar(1 / magnitude);
        return endpoint.body.genInvMass(lever, tmp[31]) * magnitudeSquared;
      }
      const wa = 1 - endpoint.t;
      const wb = endpoint.t;
      return (wa * wa * endpoint.a.w + wb * wb * endpoint.b.w) * magnitudeSquared;
    }

    _applyGradient(endpoint, gradient, deltaLambda, lever) {
      this._correction.copy(gradient).multiplyScalar(deltaLambda);
      this._apply(endpoint, this._correction, lever);
    }

    measure() {
      this._position(this.endpointA, this._a);
      this._position(this.sheaveEndpoint, this._sheave);
      this._position(this.endpointB, this._b);
      return this._a.distanceTo(this._sheave) + this._b.distanceTo(this._sheave);
    }

    solve(dt) {
      if (!this.enabled || !params.enabled) return;
      this._position(this.endpointA, this._a);
      this._position(this.sheaveEndpoint, this._sheave);
      this._position(this.endpointB, this._b);
      this._gradientA.copy(this._a).sub(this._sheave);
      this._gradientB.copy(this._b).sub(this._sheave);
      const lengthA = this._gradientA.length();
      const lengthB = this._gradientB.length();
      if (lengthA < 1e-9 || lengthB < 1e-9) return;
      this._gradientA.multiplyScalar(1 / lengthA);
      this._gradientB.multiplyScalar(1 / lengthB);
      this._gradientSheave
        .copy(this._gradientA)
        .add(this._gradientB)
        .multiplyScalar(-1);
      const constraintError = lengthA + lengthB - this.rest;
      const effectiveWeight =
        this._gradientWeight(this.endpointA, this._gradientA, this._a, this._leverA) +
        this._gradientWeight(this.endpointB, this._gradientB, this._b, this._leverB) +
        this._gradientWeight(
          this.sheaveEndpoint,
          this._gradientSheave,
          this._sheave,
          this._leverSheave,
        );
      const alpha = this.alpha / (dt * dt);
      const delta =
        (-constraintError - alpha * this.lambda) /
        Math.max(1e-9, effectiveWeight + alpha);
      const next = Math.min(0, this.lambda + delta);
      const deltaLambda = next - this.lambda;
      this.lambda = next;
      this.tension = Math.max(0, -next / (dt * dt));
      this._applyGradient(this.endpointA, this._gradientA, deltaLambda, this._leverA);
      this._applyGradient(this.endpointB, this._gradientB, deltaLambda, this._leverB);
      this._applyGradient(
        this.sheaveEndpoint,
        this._gradientSheave,
        deltaLambda,
        this._leverSheave,
      );
    }
  }

  function disableLegacyMastAndTrackConstraints() {
    const mastSet = new Set(rig.mast);
    const mainLuff = new Set(layout.main.map((row) => row[0]));
    for (const c of world.constraints) {
      if (c?.a && c?.b && mastSet.has(c.a) && mastSet.has(c.b)) {
        const ia = rig.mast.indexOf(c.a);
        const ib = rig.mast.indexOf(c.b);
        if (Math.abs(ia - ib) >= 2) {
          c.userDataV16PreviousEnabled = c.enabled;
          c.enabled = false;
          state.legacyConstraintsDisabled++;
        }
      }
      if (
        c?.p &&
        c?.pA &&
        c?.pB &&
        mainLuff.has(c.p) &&
        mastSet.has(c.pA) &&
        mastSet.has(c.pB)
      ) {
        c.userDataV16PreviousEnabled = c.enabled;
        c.enabled = false;
        state.legacyConstraintsDisabled++;
      }
    }
  }

  const rodConstraints = [];
  const trackConstraints = [];
  const standingRigConstraints = [];
  let exactForestayC = null;
  let jibHalyardC = null;

  function installMastModel() {
    disableLegacyMastAndTrackConstraints();
    for (let i = 1; i < rig.mast.length - 1; i++) {
      const c = new DirectionalRodBendConstraint(
        rig.mast[i - 1],
        rig.mast[i],
        rig.mast[i + 1],
        i,
        rig.mast.length,
        rig.segLen,
      );
      rodConstraints.push(c);
      world.addC(c);
    }
    for (let row = 0; row < layout.main.length; row++) {
      const h = cfg.mast.gooseneckH +
        (cfg.mast.height * cfg.main.headFrac - cfg.mast.gooseneckH) *
          (row / (layout.main.length - 1));
      const s = h / rig.segLen;
      const i = Math.min(Math.floor(s), rig.mast.length - 2);
      const c = new MastTrackConstraint(
        rig.mast[i],
        rig.mast[i + 1],
        layout.main[row][0],
        s - i,
        row,
        layout.main.length,
      );
      trackConstraints.push(c);
      world.addC(c);
    }
    state.rodConstraints = rodConstraints.length;
    state.trackConstraints = trackConstraints.length;
  }

  function addParticleMass(particle, massKg) {
    const mass = 1 / Math.max(1e-9, particle.w);
    particle.w = 1 / Math.max(1e-6, mass + massKg);
    state.reinforcementMassKg += massKg;
  }

  function tuneClothMechanics(system, rows, cols, kind) {
    const cloth = system?.cloth;
    if (!cloth?.cons || !cloth?.parts) return;
    const battenRows =
      kind === "main" ? new Set(cfg.main.battenRows || [4, 8, 11]) : null;
    let localBattenConstraints = 0;
    const coordinate = new Map();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) coordinate.set(cloth.parts[r][c], { r, c });
    }
    for (const constraint of cloth.cons) {
      const a = coordinate.get(constraint.a);
      const b = coordinate.get(constraint.b);
      if (!a || !b) continue;
      const dr = Math.abs(a.r - b.r);
      const dc = Math.abs(a.c - b.c);
      constraint.v16OriginalAlpha = constraint.alpha;
      if (dr === 0 && dc === 1) constraint.alpha = kind === "spin" ? 1.7e-6 : 2.8e-8;
      else if (dr === 1 && dc === 0) {
        constraint.alpha = kind === "spin" ? 1.5e-6 : 1.9e-8;
        if (kind === "jib" && a.c === 0 && b.c === 0) constraint.alpha = cfg.jib.luffWireCompliance;
      } else if (dr === 1 && dc === 1) constraint.alpha = kind === "spin" ? 6.4e-6 : 1.15e-7;
      else if (kind === "main" && dr === 0 && dc === 2 && battenRows.has(a.r)) {
        // Retain the cloth builder's skip-one chord constraint, but give the
        // three verified batten rows their dedicated (proposed) compliance.
        // This supplies actual chordwise batten stiffness; the added mass below
        // represents the physical battens and sewn reinforcement patches.
        constraint.alpha = Math.min(
          constraint.v16OriginalAlpha,
          cfg.main.battenBendCompliance,
        );
        localBattenConstraints++;
        state.battenConstraintsRetuned++;
      }
      else if (dr + dc >= 2) constraint.alpha = constraint.v16OriginalAlpha;
      state.clothConstraintsRetuned++;
    }

    if (kind === "main") {
      if (localBattenConstraints === 0) {
        state.finite = false;
        state.lastError = "no main-sail skip-one constraints were available for the batten rows";
        console.error(`${VERSION}: ${state.lastError}`);
      }
      for (const r of battenRows) {
        if (!cloth.parts[r]) continue;
        for (const p of cloth.parts[r]) addParticleMass(p, 0.11 / cols);
      }
      for (const [r, c] of [[0, 0], [0, cols - 1], [rows - 1, 0]]) {
        addParticleMass(cloth.parts[r][c], 0.045);
      }
      // Approximate sewn vinyl/tape areal mass is carried by the physical
      // membrane nodes as well as by the optical overlay.
      for (let r = 2; r <= Math.min(3, rows - 1); r++) {
        for (let c = 2; c <= Math.min(5, cols - 1); c++) addParticleMass(cloth.parts[r][c], 0.018);
      }
    } else if (kind === "jib") {
      for (const [r, c] of [[0, 0], [0, cols - 1], [rows - 1, 0]]) {
        addParticleMass(cloth.parts[r][c], 0.025);
      }
      for (let r = 1; r <= Math.min(2, rows - 1); r++) {
        for (let c = 1; c <= Math.min(3, cols - 1); c++) addParticleMass(cloth.parts[r][c], 0.012);
      }
    }
  }

  function installClothMechanics() {
    tuneClothMechanics(sails.main, cfg.main.rows, cfg.main.cols, "main");
    tuneClothMechanics(sails.jib, cfg.jib.rows, cfg.jib.cols, "jib");
    tuneClothMechanics(sails.spin, cfg.spin.rows, cfg.spin.cols, "spin");
  }

  function cableWithPretension(endpointA, endpointB, compliance, pretensionN, label) {
    const probe = new EndpointCableConstraint(endpointA, endpointB, 0, compliance, label);
    const length = probe.measure();
    probe.v16UntunedLength = length;
    probe.v16PretensionBaseN = pretensionN;
    probe.rest = Math.max(0.02, length - Math.max(0, pretensionN) * compliance);
    standingRigConstraints.push(probe);
    world.addC(probe);
    return probe;
  }

  function installStandingRig() {
    for (const c of rig.shroudCs || []) {
      c.userDataV16PreviousEnabled = c.enabled;
      c.enabled = false;
      state.legacyConstraintsDisabled++;
    }
    if (rig.forestayC?.body && rig.forestayC?.local) {
      rig.forestayC.userDataV16PreviousEnabled = rig.forestayC.enabled;
      rig.forestayC.enabled = false;
      state.legacyConstraintsDisabled++;
      const bowEndpoint = {
        type: "body",
        body: rig.forestayC.body,
        local: rig.forestayC.local.clone(),
        label: "forestay-bow-fitting",
      };
      exactForestayC = new EndpointCableConstraint(
        bowEndpoint,
        mastEndpoint(3.75),
        0,
        Math.max(0, rig.forestayC.alpha || 0),
        "forestay-safety",
      );
      exactForestayC.v16UntunedLength = exactForestayC.measure();
      exactForestayC.v16PretensionBaseN = 0;
      exactForestayC.rest =
        exactForestayC.v16UntunedLength * (1 + params.forestaySafetySlackRatio);
      standingRigConstraints.push(exactForestayC);
      world.addC(exactForestayC);
      state.forestayAttachmentReplaced = true;
    } else {
      state.finite = false;
      state.lastError = "legacy forestay body endpoint was unavailable";
      console.error(`${VERSION}: ${state.lastError}`);
    }
    const mastSet = new Set(rig.mast);
    const spreaderIndex = Math.round(
      cfg.mast.spreaderFrac * (rig.mast.length - 1),
    );
    for (const tip of rig.spreaderTips) {
      for (const constraint of world.constraints) {
        if (!constraint?.a || !constraint?.b || constraint.enabled === false) continue;
        const other =
          constraint.a === tip && mastSet.has(constraint.b)
            ? constraint.b
            : constraint.b === tip && mastSet.has(constraint.a)
              ? constraint.a
              : null;
        if (!other) continue;
        const mastIndex = rig.mast.indexOf(other);
        // Keep the three short spreader struts around the spreader station.
        // V16 replaces the two old long tip-to-base/hounds diagonals per side
        // with exact 4.21 m -> tip -> 0.36 m diamond cables below.
        if (Math.abs(mastIndex - spreaderIndex) <= 2) continue;
        constraint.userDataV16PreviousEnabled = constraint.enabled;
        constraint.enabled = false;
        state.legacyConstraintsDisabled++;
        state.legacySpreaderDiagonalsDisabled++;
      }
    }
    if (state.legacySpreaderDiagonalsDisabled !== 4) {
      state.finite = false;
      state.lastError =
        `expected four legacy long spreader diagonals; disabled ${state.legacySpreaderDiagonalsDisabled}`;
      console.error(`${VERSION}: ${state.lastError}`);
    }
    const wireCompliance = 4.1e-6;
    const diamondCompliance = 2.8e-6;
    const shroudTop = mastEndpoint(3.74);
    for (let side = 0; side < 2; side++) {
      cableWithPretension(
        bodyEndpoint(rig.chainD[side], side === 0 ? "port-chainplate" : "starboard-chainplate"),
        shroudTop,
        wireCompliance,
        params.standingRigPretensionN,
        side === 0 ? "port-shroud" : "starboard-shroud",
      );
      const spreader = particleEndpoint(
        rig.spreaderTips[side],
        side === 0 ? "port-spreader-tip" : "starboard-spreader-tip",
      );
      cableWithPretension(
        mastEndpoint(4.21),
        spreader,
        diamondCompliance,
        310,
        side === 0 ? "port-diamond-upper" : "starboard-diamond-upper",
      );
      cableWithPretension(
        spreader,
        mastEndpoint(0.36),
        diamondCompliance,
        310,
        side === 0 ? "port-diamond-lower" : "starboard-diamond-lower",
      );
    }

    // V15 snapped the jib-head terminal to the nearest mast particle. With
    // 24 rod nodes that location is about 3.796 m, not the 3.75 m jib sheave.
    // Replace only the unique 80 mm head-terminal link; the neighboring cloth
    // and luff-wire constraints must remain active.
    const jibHead = layout.jib[layout.jib.length - 1][0];
    const legacyHeadLinks = world.constraints.filter(
      (constraint) =>
        constraint &&
        ((constraint.a === jibHead && constraint.b === rig.hounds) ||
          (constraint.b === jibHead && constraint.a === rig.hounds)) &&
        Math.abs(constraint.rest - 0.08) < 1e-6 &&
        Math.abs(constraint.alpha - 1e-8) < 1e-12,
    );
    if (legacyHeadLinks.length !== 1) {
      state.finite = false;
      state.lastError =
        `expected one legacy jib-head terminal link; found ${legacyHeadLinks.length}`;
      console.error(`${VERSION}: ${state.lastError}`);
      return;
    }
    const legacyHeadLink = legacyHeadLinks[0];
    legacyHeadLink.userDataV16PreviousEnabled = legacyHeadLink.enabled;
    legacyHeadLink.enabled = false;
    state.legacyConstraintsDisabled++;
    jibHalyardC = new EndpointPulleyCableConstraint(
      particleEndpoint(jibHead, "jib-head"),
      mastEndpoint(3.75),
      mastEndpoint(0.38),
      0,
      params.jibHalyardComplianceMPerN,
      "jib-halyard-over-sheave-to-rack",
    );
    jibHalyardC.v16UntunedLength = jibHalyardC.measure();
    // Fixed total-length take-up is the force authority; there is no hidden
    // target-force servo or declared measured Laser 2 halyard setpoint.
    jibHalyardC.rest = Math.max(
      0.02,
      jibHalyardC.v16UntunedLength -
        params.jibHalyardTakeupM,
    );
    standingRigConstraints.push(jibHalyardC);
    world.addC(jibHalyardC);
    state.jibHeadAttachmentReplaced = true;
    state.jibHalyardLoadPathInstalled = true;
  }

  function sparBox(nodes, pad, out) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const node of nodes) {
      const x = node.x;
      if (x.x < x0) x0 = x.x; if (x.x > x1) x1 = x.x;
      if (x.y < y0) y0 = x.y; if (x.y > y1) y1 = x.y;
      if (x.z < z0) z0 = x.z; if (x.z > z1) z1 = x.z;
    }
    out[0] = x0 - pad; out[1] = x1 + pad; out[2] = y0 - pad; out[3] = y1 + pad; out[4] = z0 - pad; out[5] = z1 + pad;
    return out;
  }

  function insideBox(box, p) {
    return p.x >= box[0] && p.x <= box[1] && p.y >= box[2] && p.y <= box[3] && p.z >= box[4] && p.z <= box[5];
  }

  class SailSparContactConstraint {
    constructor() {
      this.lambda = 0;
      this.enabled = true;
      this._closest = new Vec3();
      this._delta = new Vec3();
      this._normal = new Vec3();
      this._mastBox = new Float64Array(6);
      this._boomBox = new Float64Array(6);
    }

    _particleCapsule(p, a, b, radius, type) {
      this._delta.copy(b.x).sub(a.x);
      const len2 = this._delta.lengthSq();
      if (len2 < 1e-12) return;
      const t = clamp(tmp[1].copy(p.x).sub(a.x).dot(this._delta) / len2, 0, 1);
      this._closest.copy(a.x).addScaledVector(this._delta, t);
      this._normal.copy(p.x).sub(this._closest);
      let distance = this._normal.length();
      const target = radius + params.clothThicknessM + params.clothCollisionMarginM;
      if (distance >= target) return;
      if (distance < 1e-8) {
        bodyAxis(type === "mast" ? unitX : unitY, this._normal);
        distance = 1e-8;
      } else this._normal.multiplyScalar(1 / distance);
      const penetration = Math.min(params.collisionMaxCorrectionM, target - distance);
      const wa = 1 - t;
      const wb = t;
      const denom = p.w + wa * wa * a.w + wb * wb * b.w;
      if (denom <= 0) return;
      const dl = penetration / denom;
      p.x.addScaledVector(this._normal, dl * p.w);
      a.x.addScaledVector(this._normal, -dl * wa * a.w);
      b.x.addScaledVector(this._normal, -dl * wb * b.w);
      state.contactCount++;
      state.contactEventsTotal++;
      if (type === "mast") {
        state.mastContacts++;
        state.mastContactEventsTotal++;
      } else {
        state.boomContacts++;
        state.boomContactEventsTotal++;
      }
      state.maxPenetrationM = Math.max(state.maxPenetrationM, target - distance);
    }

    solve() {
      if (!this.enabled || !params.enabled || !params.sailSparCollision) return;
      const start = performance.now();
      this.lambda += 1;
      const active = [layout.main, layout.jib];
      if (isSpinnakerPhysical()) active.push(layout.spin);
      // V8 broad phase: one AABB around the whole mast and one around the boom,
      // padded by the largest capsule reach plus the bounded per-contact
      // correction. Particles outside both boxes cannot touch any capsule, so
      // the unchanged per-segment narrow phase is skipped for them.
      const reach = 0.041 + params.clothThicknessM + params.clothCollisionMarginM + params.collisionMaxCorrectionM * 2;
      const mastBox = sparBox(rig.mast, mastRadiusAt(0) + reach, this._mastBox);
      const boomBox = sparBox(rig.boom, reach, this._boomBox);
      for (const sail of active) {
        for (let r = 0; r < sail.length; r++) {
          for (let c = 0; c < sail[r].length; c++) {
            if (sail === layout.main && c === 0) continue;
            const p = sail[r][c];
            const nearMast = insideBox(mastBox, p.x);
            if (!nearMast && !insideBox(boomBox, p.x)) continue;
            if (nearMast) for (let i = 0; i < rig.mast.length - 1; i++) {
              const q = p.x, sa = rig.mast[i].x, sb = rig.mast[i + 1].x;
              if (q.x < Math.min(sa.x, sb.x) - reach || q.x > Math.max(sa.x, sb.x) + reach ||
                q.y < Math.min(sa.y, sb.y) - reach || q.y > Math.max(sa.y, sb.y) + reach ||
                q.z < Math.min(sa.z, sb.z) - reach || q.z > Math.max(sa.z, sb.z) + reach) continue;
              this._particleCapsule(
                p,
                rig.mast[i],
                rig.mast[i + 1],
                mastRadiusAt((i + 0.5) / (rig.mast.length - 1)),
                "mast",
              );
            }
            for (let i = 0; i < rig.boom.length - 1; i++) {
              this._particleCapsule(p, rig.boom[i], rig.boom[i + 1], 0.041, "boom");
            }
          }
        }
      }
      state.collisionStepMs += performance.now() - start;
    }
  }

  class RigHardwareDeckContactConstraint {
    constructor(particle, radiusM = 0.012) {
      this.particle = particle;
      this.radiusM = radiusM;
      this.lambda = 0;
      this.enabled = true;
      this._local = new Vec3();
      this._target = new Vec3();
      this._correction = new Vec3();
    }

    solve() {
      if (!this.enabled || !params.enabled) return;
      worldToDesign(this.particle.x, this._local);
      if (this._local.z < -2.2 || this._local.z > 2.2) return;
      const u = clamp((this._local.z + 2.2) / 4.4, 0, 1);
      if (Math.abs(this._local.x) > hullHalfWidth(u) + 0.035) return;
      const minimumY = rigDeckY(this._local.x, this._local.z) + this.radiusM;
      if (this._local.y >= minimumY) return;
      this._target.copy(this._local);
      this._target.y = minimumY;
      designToWorld(this._target, this._target);
      this._correction.copy(this._target).sub(this.particle.x);
      if (this._correction.length() > params.collisionMaxCorrectionM) {
        this._correction.setLength(params.collisionMaxCorrectionM);
      }
      this.particle.x.add(this._correction);
      state.hardwareDeckContacts++;
      state.hardwareDeckContactEventsTotal++;
    }
  }

  function triangleIndices(rows, cols) {
    const out = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        const b = (r + 1) * cols + c;
        out.push([a, b, a + 1], [b, b + 1, a + 1]);
      }
    }
    return out;
  }

  const triangleCache = {
    main: triangleIndices(cfg.main.rows, cfg.main.cols),
    jib: triangleIndices(cfg.jib.rows, cfg.jib.cols),
    spin: triangleIndices(cfg.spin.rows, cfg.spin.cols),
  };

  function closestPointTriangle(p, a, b, c, out, bary) {
    const ab = tmp[2].copy(b).sub(a);
    const ac = tmp[3].copy(c).sub(a);
    const ap = tmp[4].copy(p).sub(a);
    const d1 = ab.dot(ap);
    const d2 = ac.dot(ap);
    if (d1 <= 0 && d2 <= 0) {
      bary[0] = 1; bary[1] = 0; bary[2] = 0;
      return out.copy(a);
    }
    const bp = tmp[5].copy(p).sub(b);
    const d3 = ab.dot(bp);
    const d4 = ac.dot(bp);
    if (d3 >= 0 && d4 <= d3) {
      bary[0] = 0; bary[1] = 1; bary[2] = 0;
      return out.copy(b);
    }
    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      const v = d1 / (d1 - d3);
      bary[0] = 1 - v; bary[1] = v; bary[2] = 0;
      return out.copy(a).addScaledVector(ab, v);
    }
    const cp = tmp[6].copy(p).sub(c);
    const d5 = ab.dot(cp);
    const d6 = ac.dot(cp);
    if (d6 >= 0 && d5 <= d6) {
      bary[0] = 0; bary[1] = 0; bary[2] = 1;
      return out.copy(c);
    }
    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      const w = d2 / (d2 - d6);
      bary[0] = 1 - w; bary[1] = 0; bary[2] = w;
      return out.copy(a).addScaledVector(ac, w);
    }
    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
      const w = (d4 - d3) / (d4 - d3 + d5 - d6);
      bary[0] = 0; bary[1] = 1 - w; bary[2] = w;
      return out.copy(b).addScaledVector(tmp[7].copy(c).sub(b), w);
    }
    const denom = 1 / (va + vb + vc);
    const v = vb * denom;
    const w = vc * denom;
    bary[0] = 1 - v - w; bary[1] = v; bary[2] = w;
    return out.copy(a).addScaledVector(ab, v).addScaledVector(ac, w);
  }

  const SAIL_SAIL_BUCKETS = 2048;
  const sailSailGridConfig = { cellM: 0.5, slackM: 0.03 };
  const sailSailGrids = new Map();

  function sailSailHash(x, y, z) {
    return ((Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) >>> 0) & (SAIL_SAIL_BUCKETS - 1);
  }

  class SailSailContactConstraint {
    constructor() {
      this.lambda = 0;
      this.enabled = true;
      this._point = new Vec3();
      this._normal = new Vec3();
      this._delta = new Vec3();
      this._bary = new Float64Array(3);
    }

    // V8 broad phase. The original narrow phase below is unchanged, but it used
    // to run every particle against every triangle of the other sail (O(n*m),
    // ~65% of total solver time). Triangles are now bucketed into a uniform
    // hash grid rebuilt per call; each particle only visits the triangles whose
    // expanded AABB overlaps its own cell. The AABB margin also covers the
    // bounded (collisionMaxCorrectionM) vertex motion that earlier
    // resolutions in the same pass can cause, so candidate sets are a
    // superset of the brute-force hits and results are identical.
    _buildGrid(triPoints, triangles, threshold) {
      // One grid per triangle set, reused across solver iterations until any
      // vertex has moved more than gridSlackM since the build. Cells are
      // padded by that slack plus the contact threshold and twice the bounded
      // per-contact correction, so every triangle whose current padded AABB
      // contains a particle is still listed in that particle's cell.
      let grid = sailSailGrids.get(triangles);
      if (!grid) {
        grid = {
          counts: new Int32Array(SAIL_SAIL_BUCKETS),
          starts: new Int32Array(SAIL_SAIL_BUCKETS + 1),
          fill: new Int32Array(SAIL_SAIL_BUCKETS),
          entries: new Int32Array(4096),
          cellRanges: new Int32Array(6 * triangles.length),
          built: new Float64Array(3 * triPoints.length),
          valid: false,
          builds: 0,
          reuses: 0,
        };
        sailSailGrids.set(triangles, grid);
      }
      const slack = sailSailGridConfig.slackM;
      if (grid.valid) {
        let moved = false;
        const built = grid.built;
        for (let i = 0, o = 0; i < triPoints.length; i++, o += 3) {
          const x = triPoints[i].x;
          if (Math.abs(x.x - built[o]) > slack || Math.abs(x.y - built[o + 1]) > slack || Math.abs(x.z - built[o + 2]) > slack) {
            moved = true;
            break;
          }
        }
        if (!moved) {
          grid.reuses++;
          return grid;
        }
      }
      const cell = sailSailGridConfig.cellM;
      const pad = threshold + params.collisionMaxCorrectionM * 2 + slack;
      const counts = grid.counts;
      counts.fill(0);
      const n = triangles.length;
      const ranges = grid.cellRanges;
      let total = 0;
      for (let t = 0; t < n; t++) {
        const tri = triangles[t];
        const a = triPoints[tri[0]].x, b = triPoints[tri[1]].x, c = triPoints[tri[2]].x;
        const x0 = Math.floor((Math.min(a.x, b.x, c.x) - pad) / cell), x1 = Math.floor((Math.max(a.x, b.x, c.x) + pad) / cell);
        const y0 = Math.floor((Math.min(a.y, b.y, c.y) - pad) / cell), y1 = Math.floor((Math.max(a.y, b.y, c.y) + pad) / cell);
        const z0 = Math.floor((Math.min(a.z, b.z, c.z) - pad) / cell), z1 = Math.floor((Math.max(a.z, b.z, c.z) + pad) / cell);
        const o = t * 6;
        ranges[o] = x0; ranges[o + 1] = x1; ranges[o + 2] = y0; ranges[o + 3] = y1; ranges[o + 4] = z0; ranges[o + 5] = z1;
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
          counts[sailSailHash(x, y, z)]++;
          total++;
        }
      }
      let offset = 0;
      for (let i = 0; i < SAIL_SAIL_BUCKETS; i++) {
        grid.starts[i] = offset;
        offset += counts[i];
      }
      grid.starts[SAIL_SAIL_BUCKETS] = offset;
      if (grid.entries.length < total) grid.entries = new Int32Array(Math.max(total, grid.entries.length * 2));
      grid.fill.set(grid.starts.subarray(0, SAIL_SAIL_BUCKETS));
      for (let t = 0; t < n; t++) {
        const o = t * 6;
        for (let x = ranges[o]; x <= ranges[o + 1]; x++) for (let y = ranges[o + 2]; y <= ranges[o + 3]; y++) for (let z = ranges[o + 4]; z <= ranges[o + 5]; z++) {
          const h = sailSailHash(x, y, z);
          grid.entries[grid.fill[h]++] = t;
        }
      }
      const built = grid.built;
      for (let i = 0, o = 0; i < triPoints.length; i++, o += 3) {
        const x = triPoints[i].x;
        built[o] = x.x; built[o + 1] = x.y; built[o + 2] = x.z;
      }
      grid.valid = true;
      grid.builds++;
      return grid;
    }

    _resolve(points, triPoints, triangles) {
      const threshold = 2 * params.clothThicknessM + params.clothCollisionMarginM;
      const grid = this._buildGrid(triPoints, triangles, threshold);
      const cell = sailSailGridConfig.cellM;
      for (const p of points) {
        let bestTri = null;
        let bestDistance = threshold;
        const h = sailSailHash(Math.floor(p.x.x / cell), Math.floor(p.x.y / cell), Math.floor(p.x.z / cell));
        const end = grid.starts[h + 1];
        for (let k = grid.starts[h]; k < end; k++) {
          const tri = triangles[grid.entries[k]];
          const a = triPoints[tri[0]];
          const b = triPoints[tri[1]];
          const c = triPoints[tri[2]];
          const minX = Math.min(a.x.x, b.x.x, c.x.x) - threshold;
          const maxX = Math.max(a.x.x, b.x.x, c.x.x) + threshold;
          const minY = Math.min(a.x.y, b.x.y, c.x.y) - threshold;
          const maxY = Math.max(a.x.y, b.x.y, c.x.y) + threshold;
          const minZ = Math.min(a.x.z, b.x.z, c.x.z) - threshold;
          const maxZ = Math.max(a.x.z, b.x.z, c.x.z) + threshold;
          if (
            p.x.x < minX || p.x.x > maxX ||
            p.x.y < minY || p.x.y > maxY ||
            p.x.z < minZ || p.x.z > maxZ
          ) continue;
          closestPointTriangle(p.x, a.x, b.x, c.x, this._point, this._bary);
          this._delta.copy(p.x).sub(this._point);
          const distance = this._delta.length();
          if (distance >= bestDistance) continue;
          this._normal.crossVectors(tmp[8].copy(b.x).sub(a.x), tmp[9].copy(c.x).sub(a.x));
          if (this._normal.lengthSq() < 1e-12) continue;
          bestTri = tri;
          bestDistance = distance;
        }
        if (!bestTri) continue;

        // Resolve the deepest (nearest) candidate, not the first triangle in
        // grid order. First-hit ordering can leave a particle several
        // millimetres inside an adjacent panel during wet turbulent motion.
        const a = triPoints[bestTri[0]];
        const b = triPoints[bestTri[1]];
        const c = triPoints[bestTri[2]];
        closestPointTriangle(p.x, a.x, b.x, c.x, this._point, this._bary);
        this._delta.copy(p.x).sub(this._point);
        let distance = this._delta.length();
        this._normal.crossVectors(tmp[8].copy(b.x).sub(a.x), tmp[9].copy(c.x).sub(a.x));
        if (this._normal.lengthSq() < 1e-12) continue;
        this._normal.normalize();
        if (distance > 1e-8) {
          this._normal.copy(this._delta).multiplyScalar(1 / distance);
        } else {
          const previousSide = tmp[10].copy(p.p).sub(a.p).dot(this._normal);
          if (previousSide < 0) this._normal.multiplyScalar(-1);
          distance = 0;
        }
        const penetration = Math.min(params.collisionMaxCorrectionM, threshold - distance);
        const u = this._bary[0], v = this._bary[1], w = this._bary[2];
        const triWeight = u * u * a.w + v * v * b.w + w * w * c.w;
        const denom = p.w + triWeight;
        if (denom <= 0) continue;
        const dl = penetration / denom;
        p.x.addScaledVector(this._normal, dl * p.w);
        a.x.addScaledVector(this._normal, -dl * u * a.w);
        b.x.addScaledVector(this._normal, -dl * v * b.w);
        c.x.addScaledVector(this._normal, -dl * w * c.w);
        state.contactCount++;
        state.sailSailContacts++;
        state.contactEventsTotal++;
        state.sailSailContactEventsTotal++;
        state.maxPenetrationM = Math.max(state.maxPenetrationM, threshold - distance);
      }
    }

    solve() {
      if (!this.enabled || !params.enabled || !params.sailSailCollision) return;
      const start = performance.now();
      this.lambda += 1;
      const passes = Math.max(1, Math.floor(params.sailSailContactPasses));
      for (let pass = 0; pass < passes; pass++) {
        this._resolve(layout.mainFlat, layout.jibFlat, triangleCache.jib);
        this._resolve(layout.jibFlat, layout.mainFlat, triangleCache.main);
        if (isSpinnakerPhysical()) {
          this._resolve(layout.spinFlat, layout.mainFlat, triangleCache.main);
          this._resolve(layout.spinFlat, layout.jibFlat, triangleCache.jib);
          this._resolve(layout.mainFlat, layout.spinFlat, triangleCache.spin);
          this._resolve(layout.jibFlat, layout.spinFlat, triangleCache.spin);
        }
      }
      state.collisionStepMs += performance.now() - start;
    }
  }

  class JibClewDeckContactConstraint {
    constructor() {
      this.lambda = 0;
      this.enabled = true;
      this._local = new Vec3();
      this._target = new Vec3();
      this._normal = new Vec3();
      this._lever = new Vec3();
      this._correction = new Vec3();
    }

    solve() {
      if (!this.enabled || !params.enabled || !params.jibClewDeckCollision) return;
      const start = performance.now();
      this.lambda += 1;
      const particle = sails.jib?.clew;
      if (!particle || particle.w <= 0) return;
      const clearance = params.clothThicknessM + params.clothCollisionMarginM;
      worldToDesign(particle.x, this._local);
      if (this._local.z < -2.22 || this._local.z > 2.22) return;
      const u = clamp((this._local.z + 2.2) / 4.4, 0, 1);
      if (Math.abs(this._local.x) > hullHalfWidth(u) + 0.035) return;
      const minimumY = rigDeckY(this._local.x, this._local.z) + clearance;
      if (this._local.y >= minimumY) return;
      const penetration = minimumY - this._local.y;
      this._local.y = minimumY;
      designToWorld(this._local, this._target);
      bodyAxis(unitY, this._normal).normalize();
      this._lever.copy(this._target).sub(body.pos);
      const bodyWeight = body.kinematic
        ? 0
        : body.genInvMass(this._lever, this._normal);
      const denominator = particle.w + bodyWeight;
      if (denominator <= 0) return;
      const deltaLambda =
        Math.min(params.collisionMaxCorrectionM, penetration) / denominator;
      particle.x.addScaledVector(this._normal, deltaLambda * particle.w);
      if (!body.kinematic) {
        this._correction.copy(this._normal).multiplyScalar(-deltaLambda);
        body.applyCorrection(this._correction, this._lever);
      }
      state.contactCount++;
      state.jibClewDeckContacts++;
      state.contactEventsTotal++;
      state.jibClewDeckContactEventsTotal++;
      state.maxPenetrationM = Math.max(state.maxPenetrationM, penetration);
      state.collisionStepMs += performance.now() - start;
    }
  }

  function isSpinnakerActive() {
    return !!(sails.spin?.state?.up || master.input?.kiteUp || master.input?.state?.kiteUp);
  }

  let spinDousing = false;
  const originalSpinHoist = sails.spin?.hoist;
  const originalSpinDouse = sails.spin?.douse;
  if (typeof originalSpinHoist === "function" && typeof originalSpinDouse === "function") {
    sails.spin.hoist = function (...args) {
      spinDousing = false;
      return originalSpinHoist.apply(this, args);
    };
    sails.spin.douse = function (...args) {
      if (this.state?.up) spinDousing = true;
      return originalSpinDouse.apply(this, args);
    };
  }

  function isSpinnakerPhysical() {
    return isSpinnakerActive() || !!(spinDousing && sails.spin?.state?.t < 2.5);
  }

  const finalContactPoint = new Vec3();
  const finalContactSegment = new Vec3();
  const finalContactBary = new Float64Array(3);
  const deckClearanceLocal = new Vec3();
  function particleDeckClearanceM(particle) {
    if (!particle?.x) return null;
    worldToDesign(particle.x, deckClearanceLocal);
    if (deckClearanceLocal.z < -2.22 || deckClearanceLocal.z > 2.22) return null;
    const u = clamp((deckClearanceLocal.z + 2.2) / 4.4, 0, 1);
    if (Math.abs(deckClearanceLocal.x) > hullHalfWidth(u) + 0.035) return null;
    return (
      deckClearanceLocal.y -
      rigDeckY(deckClearanceLocal.x, deckClearanceLocal.z) -
      params.clothThicknessM -
      params.clothCollisionMarginM
    );
  }
  function finalParticleSegmentPenetration(particle, a, b, target) {
    finalContactSegment.copy(b.x).sub(a.x);
    const lengthSquared = finalContactSegment.lengthSq();
    if (lengthSquared < 1e-12) return 0;
    const t = clamp(
      finalContactPoint
        .copy(particle.x)
        .sub(a.x)
        .dot(finalContactSegment) / lengthSquared,
      0,
      1,
    );
    finalContactPoint.copy(a.x).addScaledVector(finalContactSegment, t);
    return Math.max(0, target - particle.x.distanceTo(finalContactPoint));
  }

  function measureFinalContactPenetration() {
    let sparM = 0;
    let sailSailM = 0;
    const jibClewDeckM = Math.max(
      0,
      -(particleDeckClearanceM(sails.jib?.clew) ?? 0),
    );
    const active = [layout.main, layout.jib];
    if (isSpinnakerPhysical()) active.push(layout.spin);
    for (const sail of active) {
      for (let r = 0; r < sail.length; r++) {
        for (let c = 0; c < sail[r].length; c++) {
          const particle = sail[r][c];
          if (!(sail === layout.main && c === 0)) {
            for (let i = 0; i < rig.mast.length - 1; i++) {
              sparM = Math.max(
                sparM,
                finalParticleSegmentPenetration(
                  particle,
                  rig.mast[i],
                  rig.mast[i + 1],
                  mastRadiusAt((i + 0.5) / (rig.mast.length - 1)) +
                    params.clothThicknessM + params.clothCollisionMarginM,
                ),
              );
            }
            for (let i = 0; i < rig.boom.length - 1; i++) {
              sparM = Math.max(
                sparM,
                finalParticleSegmentPenetration(
                  particle,
                  rig.boom[i],
                  rig.boom[i + 1],
                  0.041 + params.clothThicknessM + params.clothCollisionMarginM,
                ),
              );
            }
          }
        }
      }
    }
    const threshold = 2 * params.clothThicknessM + params.clothCollisionMarginM;
    const measurePair = (points, triangles, trianglePoints) => {
      for (const particle of points) {
        for (const tri of triangles) {
          const a = trianglePoints[tri[0]];
          const b = trianglePoints[tri[1]];
          const c = trianglePoints[tri[2]];
          if (
            particle.x.x < Math.min(a.x.x, b.x.x, c.x.x) - threshold ||
            particle.x.x > Math.max(a.x.x, b.x.x, c.x.x) + threshold ||
            particle.x.y < Math.min(a.x.y, b.x.y, c.x.y) - threshold ||
            particle.x.y > Math.max(a.x.y, b.x.y, c.x.y) + threshold ||
            particle.x.z < Math.min(a.x.z, b.x.z, c.x.z) - threshold ||
            particle.x.z > Math.max(a.x.z, b.x.z, c.x.z) + threshold
          ) continue;
          closestPointTriangle(
            particle.x,
            a.x,
            b.x,
            c.x,
            finalContactPoint,
            finalContactBary,
          );
          sailSailM = Math.max(
            sailSailM,
            Math.max(0, threshold - particle.x.distanceTo(finalContactPoint)),
          );
        }
      }
    };
    measurePair(layout.mainFlat, triangleCache.jib, layout.jibFlat);
    measurePair(layout.jibFlat, triangleCache.main, layout.mainFlat);
    if (isSpinnakerPhysical()) {
      measurePair(layout.spinFlat, triangleCache.main, layout.mainFlat);
      measurePair(layout.spinFlat, triangleCache.jib, layout.jibFlat);
      measurePair(layout.mainFlat, triangleCache.spin, layout.spinFlat);
      measurePair(layout.jibFlat, triangleCache.spin, layout.spinFlat);
    }
    return {
      maxM: Math.max(sparM, sailSailM, jibClewDeckM),
      sparM,
      sailSailM,
      jibClewDeckM,
    };
  }

  installClothMechanics();
  installMastModel();
  installStandingRig();
  const sparContact = new SailSparContactConstraint();
  const sailContact = new SailSailContactConstraint();
  const jibClewDeckContact = new JibClewDeckContactConstraint();
  const bridleApexDeckContact = new RigHardwareDeckContactConstraint(rig.bridleApex);
  world.addC(sparContact);
  world.addC(sailContact);
  world.addC(jibClewDeckContact);
  world.addC(bridleApexDeckContact);

  const dryMass = new Map();
  for (const p of [...rig.mast, ...rig.boom]) dryMass.set(p, 1 / Math.max(1e-9, p.w));
  const previousSegmentWaterVelocity = new Map();
  const forceAccumulator = {
    main: new Vec3(),
    jib: new Vec3(),
    spin: new Vec3(),
    mast: new Vec3(),
    boom: new Vec3(),
  };

  function configureStandingRig() {
    const tune = (constraint, factor = 1) => {
      if (!constraint || !Number.isFinite(constraint.rest)) return;
      if (!Number.isFinite(constraint.v16UntunedRest)) {
        constraint.v16UntunedRest = constraint.rest;
      }
      const compliance = Math.max(0, constraint.alpha || 0);
      const shortening =
        params.standingRigPretensionN * params.standingRigTensionScale * factor * compliance;
      constraint.rest = Math.max(0.01, constraint.v16UntunedRest - shortening);
    };
    for (let i = 0; i < (rig.shroudCs || []).length; i++) {
      // The legacy array interleaves two diamond-like legs with the direct
      // shroud. Until the dedicated 4.21 m diamond-top cable is installed,
      // only the direct plate-to-hounds member receives full standing tune.
      tune(rig.shroudCs[i], i % 3 === 2 ? 1 : 0.46);
    }
    for (const cable of standingRigConstraints) {
      const isDiamond = cable.label.includes("diamond");
      const isJibHalyard = cable.label === "jib-halyard-over-sheave-to-rack";
      const isSafetyForestay = cable.label === "forestay-safety";
      if (isSafetyForestay) {
        // On the sailing rig the jib halyard/luff carries forward rig tension;
        // the forestay is a slack unilateral erection/safety stay.
        cable.rest =
          cable.v16UntunedLength * (1 + params.forestaySafetySlackRatio);
        continue;
      }
      const target = isJibHalyard
        ? null
        : isDiamond
          ? cable.v16PretensionBaseN
          : params.standingRigPretensionN * params.standingRigTensionScale;
      cable.rest = isJibHalyard
        ? Math.max(
            0.02,
            cable.v16UntunedLength -
              params.jibHalyardTakeupM * params.standingRigTensionScale,
          )
        : Math.max(
            0.02,
            cable.v16UntunedLength - Math.max(0, target) * cable.alpha,
          );
    }
  }

  function updateWetMass(dt) {
    let immersed = false;
    if (params.autoWetRig) {
      for (const p of [...rig.mast, ...rig.boom]) {
        const h = master.water.height(p.x.x, p.x.z);
        if (p.x.y < h + 0.015) {
          immersed = true;
          break;
        }
      }
      if (immersed) state.wetness01 = Math.min(1, state.wetness01 + dt * 2.8);
      else {
        const decay = Math.exp((-Math.LN2 * dt) / Math.max(1, params.wetDrainHalfLifeS));
        state.wetness01 *= decay;
      }
    }
    state.wetness01 = Math.max(state.wetness01, clamp(params.wetRig01, 0, 1));
    const mastExtra = (params.mastRetainedWaterKg * state.wetness01) / rig.mast.length;
    const boomExtra = (params.boomRetainedWaterKg * state.wetness01) / rig.boom.length;
    for (const p of rig.mast) p.w = 1 / (dryMass.get(p) + mastExtra);
    for (const p of rig.boom) p.w = 1 / (dryMass.get(p) + boomExtra);
    state.wetMassKg =
      state.wetness01 * (params.mastRetainedWaterKg + params.boomRetainedWaterKg);
  }

  function turbulenceAt(position, velocity) {
    const intensity = clamp(params.airTurbulence01, 0, 0.6);
    if (intensity <= 0) return velocity;
    const speed = Math.max(0.1, velocity.length());
    const along = tmp[11].copy(velocity).setY(0);
    if (along.lengthSq() < 1e-8) along.set(0, 0, 1);
    along.normalize();
    const lateral = tmp[12].crossVectors(unitY, along).normalize();
    const scale = Math.max(0.25, params.turbulenceLengthM);
    const t = Number.isFinite(master.wind.time)
      ? master.wind.time
      : performance.now() * 0.001;
    const phase = (position.x * 0.73 + position.y * 0.37 + position.z * 0.51) / scale;
    const lateralNoise =
      Math.sin(t * 2.17 + phase) * 0.46 +
      Math.sin(t * 5.13 + phase * 1.71 + 1.9) * 0.31 +
      Math.sin(t * 11.7 + phase * 3.31 + 4.1) * 0.16 +
      Math.sin(t * 23.1 + phase * 6.7 + 0.7) * 0.07;
    const verticalNoise =
      Math.sin(t * 3.37 + phase * 0.81 + 2.2) * 0.64 +
      Math.sin(t * 9.41 + phase * 2.17 + 0.2) * 0.26 +
      Math.sin(t * 18.9 + phase * 4.33 + 5.2) * 0.1;
    velocity.addScaledVector(lateral, speed * intensity * lateralNoise);
    velocity.y += speed * intensity * 0.42 * verticalNoise;
    return velocity;
  }

  function windRelative(position, particleVelocity, out) {
    master.wind.velocityAt(position, out);
    turbulenceAt(position, out);
    return out.sub(particleVelocity);
  }

  function rowAreas(kind, rows) {
    const weights = [];
    for (let r = 0; r < rows; r++) {
      const f = r / Math.max(1, rows - 1);
      let chord;
      if (kind === "main") {
        chord =
          lerp(cfg.main.foot, 0.14, Math.pow(f, 1.05)) *
          (1 + cfg.main.roach * Math.pow(Math.sin(Math.PI * f), 1.4));
      } else if (kind === "jib") chord = lerp(cfg.jib.foot, 0.05, f);
      else {
        chord = Math.max(
          0.07,
          cfg.spin.foot *
            Math.pow(1 - f, 0.72) *
            (1 + (cfg.spin.midGirthFactor - 1) * Math.sin(Math.PI * f)),
        );
      }
      weights.push(chord * (r === 0 || r === rows - 1 ? 0.5 : 1));
    }
    const sum = weights.reduce((a, b) => a + b, 0);
    const area = cfg[kind].area;
    return weights.map((w) => (w / Math.max(1e-9, sum)) * area);
  }

  const stripAreas = {
    main: rowAreas("main", cfg.main.rows),
    jib: rowAreas("jib", cfg.jib.rows),
  };

  function addDistributedRowForce(row, force) {
    let sum = 0;
    const weights = [];
    for (let c = 0; c < row.length; c++) {
      const u = c / Math.max(1, row.length - 1);
      const w = 0.32 + 1.2 * Math.exp(-Math.pow((u - 0.36) / 0.31, 2));
      weights.push(w);
      sum += w;
    }
    for (let c = 0; c < row.length; c++) row[c].f.addScaledVector(force, weights[c] / sum);
  }

  function applyStripSail(kind, rows, areaByRow, result) {
    result.set(0, 0, 0);
    const rho = cfg.env.rhoAir || 1.225;
    const stall = (params.sailStallDeg * Math.PI) / 180;
    const aspect = kind === "main" ? 4.2 : 3.35;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const luff = row[0];
      const leech = row[row.length - 1];
      const mid = row[Math.floor(row.length * 0.42)];
      const center = tmp[13].copy(luff.x).add(leech.x).multiplyScalar(0.5);
      const velocity = tmp[14]
        .copy(luff.v)
        .add(leech.v)
        .add(mid.v)
        .multiplyScalar(1 / 3);
      const chord = tmp[15].copy(leech.x).sub(luff.x);
      if (chord.lengthSq() < 1e-7) continue;
      chord.normalize();
      const prev = rows[Math.max(0, r - 1)];
      const next = rows[Math.min(rows.length - 1, r + 1)];
      const span = tmp[16]
        .copy(next[0].x)
        .add(next[next.length - 1].x)
        .sub(prev[0].x)
        .sub(prev[prev.length - 1].x);
      if (span.lengthSq() < 1e-8) continue;
      span.normalize();
      const normal = tmp[17].crossVectors(span, chord).normalize();
      const relative = windRelative(center, velocity, tmp[18]);
      relative.addScaledVector(span, -relative.dot(span));
      const speed = relative.length();
      if (speed < 0.12) continue;
      const flowDir = tmp[19].copy(relative).multiplyScalar(1 / speed);
      const sinAlpha = clamp(flowDir.dot(normal), -0.999, 0.999);
      const alpha = Math.asin(sinAlpha);
      const absAlpha = Math.abs(alpha);
      const cosAlpha = Math.sqrt(Math.max(1e-5, 1 - sinAlpha * sinAlpha));
      const clLinear = params.sailLiftSlope * alpha;
      const cnLinear = clLinear / Math.max(0.32, cosAlpha);
      const cnSeparated = params.sailPostStallCn * sinAlpha * Math.abs(sinAlpha);
      const separated = smooth(stall * 0.82, stall * 1.9, absAlpha);
      const cn = lerp(cnLinear, cnSeparated, separated);
      const clForDrag = lerp(clLinear, cnSeparated * cosAlpha, separated);
      const cd =
        params.sailProfileCd +
        (clForDrag * clForDrag) /
          (Math.PI * aspect * Math.max(0.35, params.sailInducedEfficiency)) +
        separated * 0.78 * sinAlpha * sinAlpha;
      const qA =
        0.5 * rho * speed * speed * areaByRow[r] * clamp(params.sailAeroScale, 0, 2);
      const force = tmp[20].copy(normal).multiplyScalar(qA * cn);
      force.addScaledVector(flowDir, qA * cd);
      const maxForce = qA * 2.15;
      if (force.length() > maxForce) force.setLength(maxForce);
      addDistributedRowForce(row, force);
      result.add(force);
    }
  }

  function applySpinnaker(result) {
    result.set(0, 0, 0);
    if (!isSpinnakerActive()) return;
    const rho = cfg.env.rhoAir || 1.225;
    const flat = layout.spinFlat;
    const areaScale = cfg.spin.area / Math.max(1, triangleCache.spin.length);
    for (const tri of triangleCache.spin) {
      const a = flat[tri[0]];
      const b = flat[tri[1]];
      const c = flat[tri[2]];
      const center = tmp[13].copy(a.x).add(b.x).add(c.x).multiplyScalar(1 / 3);
      const velocity = tmp[14].copy(a.v).add(b.v).add(c.v).multiplyScalar(1 / 3);
      const normal = tmp[17].crossVectors(tmp[15].copy(b.x).sub(a.x), tmp[16].copy(c.x).sub(a.x));
      if (normal.lengthSq() < 1e-10) continue;
      normal.normalize();
      const relative = windRelative(center, velocity, tmp[18]);
      const speed = relative.length();
      if (speed < 0.12) continue;
      const flowDir = tmp[19].copy(relative).multiplyScalar(1 / speed);
      const vn = flowDir.dot(normal);
      const cn = 1.28 * vn * Math.abs(vn);
      const cd = 0.055 + 0.62 * vn * vn;
      const qA = 0.5 * rho * speed * speed * areaScale * params.sailAeroScale;
      const force = tmp[20].copy(normal).multiplyScalar(qA * cn).addScaledVector(flowDir, qA * cd);
      a.f.addScaledVector(force, 1 / 3);
      b.f.addScaledVector(force, 1 / 3);
      c.f.addScaledVector(force, 1 / 3);
      result.add(force);
    }
  }

  function applyClothWater(flat) {
    const rho = cfg.env.rhoWater || 1025;
    const waterVelocity = tmp[21];
    const relative = tmp[22];
    for (const p of flat) {
      const h = master.water.height(p.x.x, p.x.z);
      if (p.x.y >= h) continue;
      const depth = Math.min(0.45, h - p.x.y);
      master.water.velocity(p.x.x, p.x.z, waterVelocity);
      relative.copy(waterVelocity).sub(p.v);
      const drag = Math.min(85, relative.length() * relative.length() * 1.7 * depth);
      if (relative.lengthSq() > 1e-9) p.f.addScaledVector(relative.normalize(), drag);
      p.f.y += Math.min(42, depth * rho * 0.0032 * 9.81);
    }
  }

  function segmentFluidForce(nodes, diameter, airCd, result, dt, keyPrefix) {
    result.set(0, 0, 0);
    const midpoint = tmp[23];
    const velocity = tmp[24];
    const tangent = tmp[25];
    const fluidVelocity = tmp[26];
    const relative = tmp[27];
    const force = tmp[28];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      midpoint.copy(a.x).add(b.x).multiplyScalar(0.5);
      velocity.copy(a.v).add(b.v).multiplyScalar(0.5);
      tangent.copy(b.x).sub(a.x);
      const length = tangent.length();
      if (length < 1e-8) continue;
      tangent.multiplyScalar(1 / length);
      const waterHeight = master.water.height(midpoint.x, midpoint.z);
      const submerged = midpoint.y < waterHeight;
      let rho;
      let cd;
      const key = `${keyPrefix}:${i}`;
      if (submerged) {
        rho = cfg.env.rhoWater || 1025;
        cd = params.sparWaterCd;
        master.water.velocity(midpoint.x, midpoint.z, fluidVelocity);
      } else {
        rho = cfg.env.rhoAir || 1.225;
        cd = airCd;
        master.wind.velocityAt(midpoint, fluidVelocity);
        turbulenceAt(midpoint, fluidVelocity);
      }
      relative.copy(fluidVelocity).sub(velocity);
      relative.addScaledVector(tangent, -relative.dot(tangent));
      const speed = relative.length();
      force.set(0, 0, 0);
      if (speed > 1e-5) {
        force.copy(relative).multiplyScalar(
          (0.5 * rho * cd * diameter * length * speed) / Math.max(speed, 1e-9),
        );
        force.multiplyScalar(speed);
      }
      if (submerged) {
        const volume = Math.PI * 0.25 * diameter * diameter * length;
        force.y += rho * 9.81 * volume;
        const old = previousSegmentWaterVelocity.get(key) || new Vec3().copy(relative);
        const acceleration = tmp[29].copy(relative).sub(old).multiplyScalar(1 / Math.max(dt, 1e-5));
        old.copy(relative);
        previousSegmentWaterVelocity.set(key, old);
        const addedMass = rho * params.sparWaterAddedMassCoeff * volume;
        const inertial = Math.min(220, addedMass * acceleration.length());
        if (acceleration.lengthSq() > 1e-9) force.addScaledVector(acceleration.normalize(), inertial);
      } else {
        // A later splash/re-entry starts from the current relative velocity;
        // stale pre-exit samples would otherwise create a one-step added-mass spike.
        previousSegmentWaterVelocity.delete(key);
      }
      const maxForce = submerged ? 520 : 75;
      if (force.length() > maxForce) force.setLength(maxForce);
      a.f.addScaledVector(force, 0.5);
      b.f.addScaledVector(force, 0.5);
      result.add(force);
    }
  }

  function applyRodDamping() {
    const tangent = tmp[15];
    const side = tmp[16];
    const fore = tmp[17];
    const dVel = tmp[18];
    const dampingForce = tmp[19];
    for (let i = 1; i < rig.mast.length - 1; i++) {
      const a = rig.mast[i - 1];
      const b = rig.mast[i];
      const c = rig.mast[i + 1];
      tangent.copy(c.x).sub(a.x).normalize();
      bodyAxis(unitX, side);
      side.addScaledVector(tangent, -side.dot(tangent));
      if (side.lengthSq() < 1e-8) bodyAxis(unitZ, side);
      side.normalize();
      fore.crossVectors(tangent, side).normalize();
      dVel.copy(a.v).add(c.v).addScaledVector(b.v, -2);
      const w = a.w + 4 * b.w + c.w;
      const effectiveMass = 1 / Math.max(1e-6, w);
      const f = i / (rig.mast.length - 1);
      for (const [axis, foreAft] of [[side, false], [fore, true]]) {
        const stiffness = mastEiAt(f, foreAft) / Math.pow(rig.segLen, 3);
        const damping =
          params.mastStructuralDamping * 2 * Math.sqrt(Math.max(0, stiffness * effectiveMass));
        const scalar = clamp(-damping * dVel.dot(axis), -240, 240);
        dampingForce.copy(axis).multiplyScalar(scalar);
        a.f.add(dampingForce);
        b.f.addScaledVector(dampingForce, -2);
        c.f.add(dampingForce);
      }
    }
  }

  const trapezeTop = mastEndpoint(4.21);
  function applyTrapezeLoad() {
    state.trapezeTensionN = 0;
    if (!master.input?.state?.trapeze || !master.crew?.harness) return;
    const top = tmp[6]
      .copy(trapezeTop.a.x)
      .lerp(trapezeTop.b.x, trapezeTop.t);
    const harness = designToWorld(master.crew.harness, tmp[7]);
    const topToHarness = tmp[8].copy(harness).sub(top);
    const length = topToHarness.length();
    if (length < 0.15) return;
    topToHarness.multiplyScalar(1 / length);
    const upwardAtHarness = Math.max(0.22, -topToHarness.y);
    const tension = clamp(
      ((cfg.crew.crewMass || 75) * (cfg.env.g || 9.81) * params.trapezeLoadScale) /
        upwardAtHarness,
      0,
      2000,
    );
    const mastForce = tmp[9].copy(topToHarness).multiplyScalar(tension);
    const wa = 1 - trapezeTop.t;
    trapezeTop.a.f.addScaledVector(mastForce, wa);
    trapezeTop.b.f.addScaledVector(mastForce, trapezeTop.t);
    body.addForceAt(tmp[10].copy(mastForce).multiplyScalar(-1), harness);
    state.trapezeTensionN = tension;
  }

  function newAeroAndWetHook(dt) {
    if (!params.enabled) return;
    const start = performance.now();
    state.contactCount = 0;
    state.mastContacts = 0;
    state.boomContacts = 0;
    state.sailSailContacts = 0;
    state.jibClewDeckContacts = 0;
    state.hardwareDeckContacts = 0;
    state.maxPenetrationM = 0;
    state.collisionStepMs = 0;
    configureStandingRig();
    updateWetMass(dt);
    applyStripSail("main", layout.main, stripAreas.main, forceAccumulator.main);
    applyStripSail("jib", layout.jib, stripAreas.jib, forceAccumulator.jib);
    applySpinnaker(forceAccumulator.spin);
    applyClothWater(layout.mainFlat);
    applyClothWater(layout.jibFlat);
    if (isSpinnakerPhysical()) applyClothWater(layout.spinFlat);
    segmentFluidForce(
      rig.mast,
      lerp(params.mastLowerDiameterM, params.mastUpperDiameterM, 0.45),
      params.mastAirCd,
      forceAccumulator.mast,
      dt,
      "mast",
    );
    segmentFluidForce(rig.boom, 0.075, params.boomAirCd, forceAccumulator.boom, dt, "boom");
    applyRodDamping();
    applyTrapezeLoad();
    state.mainForceN = forceAccumulator.main.length();
    state.jibForceN = forceAccumulator.jib.length();
    state.spinForceN = forceAccumulator.spin.length();
    state.sailForceN = tmp[30]
      .copy(forceAccumulator.main)
      .add(forceAccumulator.jib)
      .add(forceAccumulator.spin)
      .length();
    state.mastAirForceN = forceAccumulator.mast.length();
    state.boomAirForceN = forceAccumulator.boom.length();
    state.aeroStepMs = performance.now() - start;
    state.steps++;
  }

  const legacyAeroHook = world.forceHooks[1];
  if (typeof legacyAeroHook !== "function") {
    state.finite = false;
    state.lastError = "legacy sail force hook at index 1 was not found";
    console.error(`${VERSION}: ${state.lastError}`);
    return;
  }
  world.forceHooks[1] = newAeroAndWetHook;
  world.iterations = Math.max(world.iterations || 1, params.solverIterations);

  function calculateMastMetrics() {
    const base = rig.mast[0].x;
    const top = rig.mast[rig.mast.length - 1].x;
    const line = tmp[0].copy(top).sub(base);
    const lineLen2 = Math.max(1e-9, line.lengthSq());
    const rootDirection = tmp[1].copy(rig.mast[1].x).sub(base).normalize();
    const expectedTop = tmp[2].copy(base).addScaledVector(rootDirection, cfg.mast.height);
    state.mastTipOffsetM = top.distanceTo(expectedTop);
    state.maxBendM = 0;
    state.maxCurvatureInvM = 0;
    state.mastStrainEnergyJ = 0;
    for (let i = 1; i < rig.mast.length - 1; i++) {
      const p = rig.mast[i].x;
      const t = clamp(tmp[3].copy(p).sub(base).dot(line) / lineLen2, 0, 1);
      const closest = tmp[4].copy(base).addScaledVector(line, t);
      state.maxBendM = Math.max(state.maxBendM, p.distanceTo(closest));
      const second = tmp[5]
        .copy(rig.mast[i - 1].x)
        .add(rig.mast[i + 1].x)
        .addScaledVector(rig.mast[i].x, -2);
      const curvature = second.length() / Math.max(1e-8, rig.segLen * rig.segLen);
      const f = i / (rig.mast.length - 1);
      state.maxCurvatureInvM = Math.max(state.maxCurvatureInvM, curvature);
      state.mastStrainEnergyJ +=
        0.5 * mastEiAt(f, false) * curvature * curvature * rig.segLen;
    }
    const runtimeFinite = [
      state.mastTipOffsetM,
      state.maxBendM,
      state.maxCurvatureInvM,
      state.mastStrainEnergyJ,
      state.sailForceN,
    ].every(Number.isFinite);
    state.finite = state.finite && runtimeFinite;
    if (!runtimeFinite && !state.lastError) {
      state.lastError = "non-finite mast/load telemetry";
    }
  }

  function metrics() {
    calculateMastMetrics();
    const finalPenetration = measureFinalContactPenetration();
    const jibClewDeckClearanceM = particleDeckClearanceM(sails.jib?.clew);
    const jibCurrentLuffRestM = sails.jib.cloth.vertCons[0].reduce(
      (total, constraint) => total + constraint.rest,
      0,
    );
    const jibCurrentLuffRestErrorM = Math.abs(
      jibCurrentLuffRestM - cfg.jib.luff,
    );
    const sheet = rig.sheetC;
    const standingCableTensionsN = Object.fromEntries(
      standingRigConstraints.map((c) => [c.label, Math.max(0, c.tension || 0)]),
    );
    const shroudTensions = [
      standingCableTensionsN["port-shroud"] || 0,
      standingCableTensionsN["starboard-shroud"] || 0,
    ];
    return {
      version: VERSION,
      enabled: params.enabled,
      finite: state.finite,
      lastError: state.lastError,
      steps: state.steps,
      frame: state.frame,
      solverIterations: world.iterations,
      mast: {
        nodes: rig.mast.length,
        elementLengthM: rig.segLen,
        lowerEiSideNm2: params.mastEiLowerSideNm2 * params.mastEiScale,
        upperEiSideNm2: params.mastEiUpperSideNm2 * params.mastEiScale,
        foreAftFactor: params.mastForeAftFactor,
        maxBendM: state.maxBendM,
        tipOffsetM: state.mastTipOffsetM,
        maxCurvatureInvM: state.maxCurvatureInvM,
        strainEnergyJ: state.mastStrainEnergyJ,
        legacyConstraintsDisabled: state.legacyConstraintsDisabled,
        rodConstraints: state.rodConstraints,
        trackConstraints: state.trackConstraints,
        exactJibHeadTerminal: state.jibHeadAttachmentReplaced,
        jibHalyardLoadPath: state.jibHalyardLoadPathInstalled,
        exactForestayTerminal: state.forestayAttachmentReplaced,
        legacySpreaderDiagonalsDisabled: state.legacySpreaderDiagonalsDisabled,
      },
      loads: {
        sailResultantN: state.sailForceN,
        mainN: state.mainForceN,
        jibN: state.jibForceN,
        spinnakerN: state.spinForceN,
        mastAirWaterN: state.mastAirForceN,
        boomAirWaterN: state.boomAirForceN,
        mainsheetN: Math.max(0, sheet?.workingTensionN || 0),
        forestayN: Math.max(0, exactForestayC?.tension || 0),
        jibHalyardN: Math.max(0, jibHalyardC?.tension || 0),
        jibHalyardTakeupM:
          params.jibHalyardTakeupM * params.standingRigTensionScale,
        jibHalyardControlMode: "fixed total-length take-up (not target-force controlled)",
        shroudsN: shroudTensions,
        trapezeN: state.trapezeTensionN,
        standingCablesN: standingCableTensionsN,
      },
      wetRig: {
        wetness01: state.wetness01,
        retainedMassKg: state.wetMassKg,
        automatic: params.autoWetRig,
        dryBoomKg: cfg.boom.massTotal,
      },
      contacts: {
        total: state.contactCount,
        mast: state.mastContacts,
        boom: state.boomContacts,
        sailSail: state.sailSailContacts,
        jibClewDeck: state.jibClewDeckContacts,
        maxPenetrationM: state.maxPenetrationM,
        solveMs: state.collisionStepMs,
        finalPenetrationM: finalPenetration.maxM,
        finalSparPenetrationM: finalPenetration.sparM,
        finalSailSailPenetrationM: finalPenetration.sailSailM,
        finalJibClewDeckPenetrationM: finalPenetration.jibClewDeckM,
        jibClewInDeckContactDomain: jibClewDeckClearanceM !== null,
        jibClewDeckClearanceM,
        cumulative: {
          total: state.contactEventsTotal,
          mast: state.mastContactEventsTotal,
          boom: state.boomContactEventsTotal,
          sailSail: state.sailSailContactEventsTotal,
          jibClewDeck: state.jibClewDeckContactEventsTotal,
          hardwareDeck: state.hardwareDeckContactEventsTotal,
        },
        hardwareDeck: state.hardwareDeckContacts,
      },
      cloth: {
        formulation: "orthotropic warp/fill/bias XPBD membrane with batten-row skip-one stiffness and reinforcement mass",
        constraintsRetuned: state.clothConstraintsRetuned,
        battenConstraintsRetuned: state.battenConstraintsRetuned,
        addedBattenPatchVinylMassKg: state.reinforcementMassKg,
        mainBattens: (cfg.main.battenRows || []).length,
        jibConfiguredLuffM: cfg.jib.luff,
        jibGeneratedLuffM: generatedJibLuffM,
        jibGeneratedLuffErrorM: generatedJibLuffErrorM,
        jibCurrentLuffRestM,
        jibCurrentLuffRestErrorM,
        jibLuffRestAuthority:
          "fixed measured material rest; halyard force comes from total-length pulley take-up",
      },
      aero: {
        authority: "single quasi-steady strip solver for main/jib plus panel pressure for spinnaker",
        turbulence01: params.airTurbulence01,
        stepMs: state.aeroStepMs,
      },
      truthBoundary: {
        verified:
          "loads originate on deformable sail/spar particles and transfer through explicit luff, sheet and standing-rig constraints",
        inferred:
          "EI, pretension, retained-water mass, rope/hardware positions and cloth transport remain calibration parameters until measured Laser 2 data are supplied",
        reduced:
          "quasi-steady aerodynamics, 24-node spar, Morison-style immersed spar force, targeted reaction-coupled jib-clew/deck heightfield contact only (not full sail-to-hull shell contact), no resolved boundary layer or torsion warping",
      },
      sourceModified: true,
    };
  }

  function setParam(name, value) {
    if (!(name in params) || typeof params[name] === "boolean" || !Number.isFinite(+value)) return false;
    params[name] = +value;
    if (name === "solverIterations") world.iterations = Math.max(1, Math.round(params[name]));
    configureStandingRig();
    return true;
  }

  function runDeterministicAudit({ calmSteps = 20, loadedSteps = 45, windKn = 9 } = {}) {
    const sim = window.__sim;
    if (!sim?.stepN) throw new Error("__sim deterministic stepping API is unavailable");
    const previousBodyKinematic = body.kinematic;
    body.kinematic = true;
    try {
    sim.pause(true);
    params.autoWetRig = true;
    params.wetRig01 = 0;
    params.airTurbulence01 = 0.18;
    state.wetness01 = 0;
    state.wetMassKg = 0;
    if (master.wind) {
      master.wind.gustiness = 0.16;
      if (Number.isFinite(master.wind.time)) master.wind.time = 0;
    }
    if (cfg.sea) cfg.sea.userScale = 1;
    params.sailSparCollision = true;
    params.sailSailCollision = true;
    params.jibClewDeckCollision = true;
    sim.setWind(0, 0);
    sim.set({
      mainScope: 0.58,
      jibScope: 0.58,
      vang: 0.30,
      cunningham: 0.25,
      outhaul: 0.42,
      hike: 0.35,
      trapeze: false,
    });
    sim.reset();
    window.LASER2_ROPE_HARDWARE_V16?.resetVisualRopes?.();
    sim.stepN(calmSteps);
    const calm = structuredClone(metrics());
    const calmShape = rig.mast.map((particle) => worldToDesign(particle.x, new Vec3()));
    const calmBase = calmShape[0].clone();
    for (const point of calmShape) point.sub(calmBase);
    sim.setWind(windKn, 0);
    sim.set({ mainScope: 0.52, jibScope: 0.52, vang: 0.38, hike: 0.72 });
    sim.stepN(loadedSteps);
    const loaded = structuredClone(metrics());
    const loadedShape = rig.mast.map((particle) => worldToDesign(particle.x, new Vec3()));
    const loadedBase = loadedShape[0].clone();
    for (const point of loadedShape) point.sub(loadedBase);
    let mastShapeDeltaSquared = 0;
    let mastShapeDeltaMaxM = 0;
    for (let i = 0; i < calmShape.length; i++) {
      const delta = calmShape[i].distanceTo(loadedShape[i]);
      mastShapeDeltaSquared += delta * delta;
      mastShapeDeltaMaxM = Math.max(mastShapeDeltaMaxM, delta);
    }
    const mastShapeDeltaRmsM = Math.sqrt(
      mastShapeDeltaSquared / Math.max(1, calmShape.length),
    );
    const criteria = {
      finite: calm.finite && loaded.finite,
      sailLoadIncrease:
        loaded.loads.sailResultantN > Math.max(50, calm.loads.sailResultantN * 2),
      loadDrivenShapeChange:
        mastShapeDeltaRmsM > 0.005 && mastShapeDeltaMaxM > 0.01,
      sailDominatesBareSpar:
        loaded.loads.sailResultantN >
        loaded.loads.mastAirWaterN + loaded.loads.boomAirWaterN,
      exactJibHeadTerminal: loaded.mast.exactJibHeadTerminal === true,
      jibHalyardLoadPath:
        loaded.mast.jibHalyardLoadPath === true && loaded.loads.jibHalyardN > 100,
      jibHalyardPrimaryForwardRig:
        loaded.loads.jibHalyardN > loaded.loads.forestayN,
      generatedJibLuffMatchesConfigured:
        Math.abs(
          loaded.cloth.jibGeneratedLuffM - loaded.cloth.jibConfiguredLuffM,
        ) <= 5e-6,
      liveJibLuffRestMatchesConfigured:
        loaded.cloth.jibCurrentLuffRestErrorM <= 5e-6,
      legacySpreaderDiagonalsRemoved:
        loaded.mast.legacySpreaderDiagonalsDisabled === 4,
      battenStiffnessActive: loaded.cloth.battenConstraintsRetuned > 0,
      contactPenetrationBounded: loaded.contacts.maxPenetrationM < 0.08,
      bendBounded: loaded.mast.maxBendM < 1.25,
    };
      return {
        version: VERSION,
        calm,
        loaded,
        response: { mastShapeDeltaRmsM, mastShapeDeltaMaxM },
        criteria,
        pass: Object.values(criteria).every(Boolean),
        bodyMode: "kinematic hull isolation",
        note: "Repeatable isolated-rig regression case, not a whole-boat dynamics test, physical certification, or class-measurement test.",
      };
    } finally {
      body.kinematic = previousBodyKinematic;
    }
  }

  function restoreLegacy() {
    world.forceHooks[1] = legacyAeroHook;
    for (const c of world.constraints) {
      if ("userDataV16PreviousEnabled" in c) c.enabled = c.userDataV16PreviousEnabled !== false;
    }
    for (const c of [
      ...rodConstraints,
      ...trackConstraints,
      ...standingRigConstraints,
      sparContact,
      sailContact,
      jibClewDeckContact,
      bridleApexDeckContact,
    ]) c.enabled = false;
    for (const [p, mass] of dryMass) p.w = 1 / mass;
    previousSegmentWaterVelocity.clear();
    state.wetness01 = 0;
    state.wetMassKg = 0;
    if (typeof originalSpinHoist === "function") sails.spin.hoist = originalSpinHoist;
    if (typeof originalSpinDouse === "function") sails.spin.douse = originalSpinDouse;
    if (typeof originalJibSetHalyard === "function") {
      sails.jib.setHalyard = originalJibSetHalyard;
      originalJibSetHalyard.call(
        sails.jib,
        master.input?.state?.jibHalyard ?? 0.5,
      );
    }
    params.enabled = false;
    if (simControl?.reset === wrappedSimReset) simControl.reset = previousSimReset;
  }

  function addUI() {
    const panel = document.querySelector(".laser2-lab");
    if (!panel || document.getElementById("laser2-v16-rig-panel")) return;
    const section = document.createElement("section");
    section.id = "laser2-v16-rig-panel";
    section.innerHTML = `
      <h3>V16 · SAIL-LOADED ELASTIC RIG</h3>
      <table><tbody>
        <tr><td>mast bend / tip</td><td id="v16-mast-bend">—</td></tr>
        <tr><td>sail / sheet load</td><td id="v16-rig-load">—</td></tr>
        <tr><td>contact</td><td id="v16-contact">—</td></tr>
        <tr><td>wet retained mass</td><td id="v16-wet">—</td></tr>
      </tbody></table>
      <label>mast EI <input id="v16-ei" type="range" min="0.45" max="1.8" step="0.01" value="${params.mastEiScale}"> <span id="v16-ei-v">${params.mastEiScale.toFixed(2)}×</span></label>
      <label>wind turbulence <input id="v16-turb" type="range" min="0" max="0.45" step="0.01" value="${params.airTurbulence01}"> <span id="v16-turb-v">${Math.round(params.airTurbulence01 * 100)}%</span></label>
      <label>wet rig <input id="v16-wet-slider" type="range" min="0" max="1" step="0.01" value="${params.wetRig01}"> <span id="v16-wet-v">${Math.round(params.wetRig01 * 100)}%</span></label>
      <div class="truth">THE CURVE IS NOT PRESCRIBED. PANEL AIR LOADS ENTER THE CLOTH, THE LUFF/FOOT/CLEW TRANSFER THEM TO THE TAPERED ROD AND BOOM, AND THE STANDING/RUNNING RIG REACTS THEM INTO THE HULL. EI AND PRETENSION REMAIN EXPLICIT CALIBRATION VALUES.</div>`;
    panel.appendChild(section);
    const bind = (id, valueId, key, format) => {
      const input = section.querySelector(`#${id}`);
      const value = section.querySelector(`#${valueId}`);
      input.addEventListener("input", () => {
        params[key] = +input.value;
        value.textContent = format(params[key]);
      });
    };
    bind("v16-ei", "v16-ei-v", "mastEiScale", (v) => `${v.toFixed(2)}×`);
    bind("v16-turb", "v16-turb-v", "airTurbulence01", (v) => `${Math.round(v * 100)}%`);
    bind("v16-wet-slider", "v16-wet-v", "wetRig01", (v) => `${Math.round(v * 100)}%`);
  }

  function refreshUI() {
    addUI();
    const m = metrics();
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set("v16-mast-bend", `${(m.mast.maxBendM * 1000).toFixed(0)} / ${(m.mast.tipOffsetM * 1000).toFixed(0)} mm`);
    set("v16-rig-load", `${m.loads.sailResultantN.toFixed(0)} / ${m.loads.mainsheetN.toFixed(0)} N`);
    set("v16-contact", `${m.contacts.total} · ${(m.contacts.maxPenetrationM * 1000).toFixed(1)} mm`);
    set("v16-wet", `${(m.wetRig.wetness01 * 100).toFixed(0)}% · ${m.wetRig.retainedMassKg.toFixed(2)} kg`);
    let hud = document.getElementById("laser2-v16-hud");
    if (!hud) {
      const anchor = document.getElementById("laser2-v15-hud") || document.querySelector(".bottom-left");
      hud = document.createElement("div");
      hud.id = "laser2-v16-hud";
      hud.className = "rig-state";
      anchor.after(hud);
    }
    hud.textContent = `V16 RIG · BEND ${(m.mast.maxBendM * 1000).toFixed(0)} mm · SAIL ${m.loads.sailResultantN.toFixed(0)} N · CONTACT ${m.contacts.total} · WET ${(m.wetRig.wetness01 * 100).toFixed(0)}%`;
  }

  const previousMetrics = window.__labMetrics;
  window.__labMetrics = function () {
    const base = typeof previousMetrics === "function" ? previousMetrics() : {};
    return { ...base, riggingV16: metrics() };
  };

  function resetDynamicRigState() {
    params.autoWetRig = true;
    params.wetRig01 = 0;
    state.wetness01 = 0;
    state.wetMassKg = 0;
    previousSegmentWaterVelocity.clear();
    for (const [particle, mass] of dryMass) particle.w = 1 / mass;
  }

  const simControl = window.__sim;
  const previousSimReset =
    typeof simControl?.reset === "function" ? simControl.reset : null;
  const wrappedSimReset = previousSimReset
    ? function (...args) {
        const result = previousSimReset.apply(simControl, args);
        resetDynamicRigState();
        return result;
      }
    : null;
  if (wrappedSimReset) simControl.reset = wrappedSimReset;

  const receipt = Object.freeze({
    baselineSha256: "0912ed37e7a2c58494d18f27dc82d0a0d95d87337114756bde8d7284739290df",
    mast: "legacy global chord stiffness disabled; tapered directional discrete-rod curvature constraints active",
    loadPath: "main/jib strip and spinnaker panel forces applied to physical cloth particles",
    jibLuff: "generated and live luff-wire material rest fixed at 3.740 m; pulley-cable take-up carries halyard authority",
    contact: "main/jib/spinnaker to mast/boom, cross-sail point-triangle XPBD, and targeted reaction-coupled jib-clew/deck heightfield contact",
    wetRig: "retained water mass, drainage, buoyancy, water-relative drag and finite-difference added-mass term",
    calibration: "EI/pretension/wet mass are exposed inferred values, not class-certified measurements",
  });

  window.LASER2_RIGGING_V16 = {
    VERSION,
    params,
    state,
    layout,
    rodConstraints,
    trackConstraints,
    standingRigConstraints,
    contacts: { sparContact, sailContact, jibClewDeckContact },
    metrics,
    setParam,
    runDeterministicAudit,
    resetDynamicRigState,
    restoreLegacy,
    receipt,
    helpers: {
      designToWorld,
      worldToDesign,
      mastRadiusAt,
      isSpinnakerActive,
      isSpinnakerPhysical,
    },
  };

  document.head.appendChild(
    Object.assign(document.createElement("style"), {
      textContent: "#laser2-v16-rig-panel{border-top:1px solid rgba(121,224,178,.62)}",
    }),
  );
  let lastUi = 0;
  function frame() {
    state.frame++;
    calculateMastMetrics();
    const now = performance.now();
    if (now - lastUi > 180) {
      lastUi = now;
      refreshUI();
    }
  }
  window.LASER2_FRAME_HOOKS.push(frame);
  state.initialized = true;
  document.title = "Laser 2 — Elastic Sail-Loaded Rig V16";
  console.info(`${VERSION} initialized`, metrics(), receipt);
})();
